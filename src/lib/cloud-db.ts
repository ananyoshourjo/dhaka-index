import "server-only";

import { getCloudflareDb } from "@/lib/cloudflare";
import { nowDhakaIso } from "@/lib/time";

export type ActiveJob = {
  id: number;
  title: string;
  company: string;
  deadlineAt: string | null;
  detailUrl: string;
  bookmarkedAt: string | null;
};

export type OfficialFeedJob = {
  title: string;
  company: string;
  deadlineAt: string | null;
  canonicalUrl: string;
};

export type JobFeedStateRow = {
  feed_url: string | null;
  etag: string | null;
  last_checked_at: string | null;
  last_success_at: string | null;
  feed_generated_at: string | null;
  last_error: string | null;
};

function statement(sql: string, values: unknown[] = []) {
  return getCloudflareDb()
    .prepare(sql)
    .bind(...values);
}

export async function hasAnyAdmin() {
  return Boolean(
    await statement(`SELECT 1 AS present FROM app_admins LIMIT 1`).first(),
  );
}

export async function isAdmin(userId: string) {
  return Boolean(
    await statement(
      `SELECT 1 AS present FROM app_admins WHERE user_id = ? LIMIT 1`,
      [userId],
    ).first(),
  );
}

export async function cleanupUserData(userId: string) {
  const db = getCloudflareDb();

  await db.batch([
    db
      .prepare(`DELETE FROM job_user_state WHERE user_id = ?`)
      .bind(userId),
    db
      .prepare(`DELETE FROM resume_profiles WHERE id = ?`)
      .bind(`profile:${userId}`),
    db
      .prepare(`DELETE FROM app_admins WHERE user_id = ?`)
      .bind(userId),
  ]);
}

export async function getUserDataExport(userId: string) {
  const [user, resume, jobState] = await Promise.all([
    statement(
      `
        SELECT id, name, email, "emailVerified", image, "createdAt", "updatedAt"
        FROM "user"
        WHERE id = ?
      `,
      [userId],
    ).first(),
    statement(
      `SELECT content_json, updated_at FROM resume_profiles WHERE id = ?`,
      [`profile:${userId}`],
    ).first<{ content_json: string; updated_at: string }>(),
    statement(
      `
        SELECT
          jobs.canonical_url AS canonicalUrl,
          state.bookmarked_at AS bookmarkedAt,
          state.archived_at AS archivedAt
        FROM job_user_state AS state
        INNER JOIN jobs ON jobs.id = state.job_id
        WHERE state.user_id = ?
        ORDER BY jobs.canonical_url
      `,
      [userId],
    ).all(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user,
    resume: resume
      ? {
          content: JSON.parse(resume.content_json) as unknown,
          updatedAt: resume.updated_at,
        }
      : null,
    jobState: jobState.results,
  };
}

export async function archiveJobById(userId: string, jobId: number) {
  return statement(
    `
      INSERT INTO job_user_state (user_id, job_id, archived_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, job_id) DO UPDATE SET
        archived_at = excluded.archived_at
    `,
    [userId, jobId, nowDhakaIso()],
  ).run();
}

export async function unarchiveJobById(userId: string, jobId: number) {
  return statement(
    `
      UPDATE job_user_state
      SET archived_at = NULL
      WHERE user_id = ?
        AND job_id = ?
        AND archived_at IS NOT NULL
    `,
    [userId, jobId],
  ).run();
}

export async function bookmarkJobById(userId: string, jobId: number) {
  return statement(
    `
      INSERT INTO job_user_state (user_id, job_id, bookmarked_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, job_id) DO UPDATE SET
        bookmarked_at = COALESCE(bookmarked_at, excluded.bookmarked_at)
    `,
    [userId, jobId, nowDhakaIso()],
  ).run();
}

export async function unbookmarkJobById(userId: string, jobId: number) {
  return statement(
    `
      UPDATE job_user_state
      SET bookmarked_at = NULL
      WHERE user_id = ?
        AND job_id = ?
        AND bookmarked_at IS NOT NULL
    `,
    [userId, jobId],
  ).run();
}

async function getJobs(userId: string, mode: "active" | "archived" | "bookmarked") {
  const fromClause =
    mode === "active"
      ? `
        FROM jobs
        LEFT JOIN job_user_state AS state
          ON state.job_id = jobs.id
          AND state.user_id = ?`
      : `
        FROM job_user_state AS state
        INNER JOIN jobs ON jobs.id = state.job_id`;
  const modeFilter =
    mode === "active"
      ? `state.archived_at IS NULL`
      : mode === "archived"
        ? `state.user_id = ? AND state.archived_at IS NOT NULL`
        : `state.user_id = ? AND state.bookmarked_at IS NOT NULL AND state.archived_at IS NULL`;
  const orderBy =
    mode === "active"
      ? `jobs.first_listed_at DESC, jobs.id DESC`
      : mode === "archived"
        ? `state.archived_at DESC, jobs.id DESC`
        : `state.bookmarked_at DESC, jobs.id DESC`;

  const result = await statement(
    `
      SELECT
        jobs.id,
        COALESCE(jobs.admin_title, jobs.title) AS title,
        COALESCE(jobs.admin_company, jobs.company) AS company,
        CASE
          WHEN jobs.admin_deadline_override = 1 THEN jobs.admin_deadline_at
          ELSE jobs.deadline_at
        END AS deadlineAt,
        jobs.detail_url AS detailUrl,
        state.bookmarked_at AS bookmarkedAt
      ${fromClause}
      WHERE ${modeFilter}
        AND jobs.expired_at IS NULL
        AND jobs.deleted_at IS NULL
      ORDER BY ${orderBy}
    `,
    [userId],
  ).all<ActiveJob>();

  return result.results;
}

export function getActiveJobsFromDb(userId: string) {
  return getJobs(userId, "active");
}

export function getArchivedJobsFromDb(userId: string) {
  return getJobs(userId, "archived");
}

export function getBookmarkedJobsFromDb(userId: string) {
  return getJobs(userId, "bookmarked");
}

export async function getJobFeedState() {
  return (
    (await statement(`SELECT * FROM job_feed_state WHERE id = 1`).first<
      JobFeedStateRow
    >()) ?? null
  );
}

export async function saveJobFeedState(input: {
  feedUrl: string;
  etag: string | null;
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  feedGeneratedAt: string | null;
  lastError: string | null;
}) {
  return statement(
    `
      INSERT INTO job_feed_state (
        id,
        feed_url,
        etag,
        last_checked_at,
        last_success_at,
        feed_generated_at,
        last_error
      )
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        feed_url = excluded.feed_url,
        etag = excluded.etag,
        last_checked_at = excluded.last_checked_at,
        last_success_at = excluded.last_success_at,
        feed_generated_at = excluded.feed_generated_at,
        last_error = excluded.last_error
    `,
    [
      input.feedUrl,
      input.etag,
      input.lastCheckedAt,
      input.lastSuccessAt,
      input.feedGeneratedAt,
      input.lastError,
    ],
  ).run();
}

export async function acquireJobFeedSyncLease(input: {
  owner: string;
  acquiredAt: string;
  expiresAt: string;
}) {
  const result = await statement(
    `
      INSERT INTO job_feed_sync_lock (id, owner, acquired_at, expires_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner = excluded.owner,
        acquired_at = excluded.acquired_at,
        expires_at = excluded.expires_at
      WHERE job_feed_sync_lock.expires_at <= excluded.acquired_at
    `,
    [input.owner, input.acquiredAt, input.expiresAt],
  ).run();

  return result.meta.changes === 1;
}

export async function releaseJobFeedSyncLease(owner: string) {
  return statement(
    `DELETE FROM job_feed_sync_lock WHERE id = 1 AND owner = ?`,
    [owner],
  ).run();
}

export async function applyOfficialFeed(
  jobs: OfficialFeedJob[],
  input: {
    checkedAt: string;
    etag: string | null;
    feedGeneratedAt: string;
    feedUrl: string;
  },
) {
  const db = getCloudflareDb();
  const statements: D1PreparedStatement[] = [];
  // Keep each statement below D1's 100-bound-parameter limit (14 × 7 = 98).
  const chunkSize = 14;

  for (let index = 0; index < jobs.length; index += chunkSize) {
    const chunk = jobs.slice(index, index + chunkSize);
    const values: unknown[] = [];
    const rows = chunk
      .map((job) => {
        values.push(
          job.title,
          job.company,
          job.canonicalUrl,
          job.canonicalUrl,
          job.deadlineAt,
          input.checkedAt,
        );
        return `(?, ?, ?, ?, ?, ?, ?)`;
      })
      .join(", ");

    const expandedValues: unknown[] = [];
    for (let offset = 0; offset < values.length; offset += 6) {
      expandedValues.push(
        values[offset],
        values[offset + 1],
        values[offset + 2],
        values[offset + 3],
        values[offset + 4],
        values[offset + 5],
        values[offset + 5],
      );
    }

    statements.push(
      db
        .prepare(
          `
            INSERT INTO jobs (
              title,
              company,
              detail_url,
              canonical_url,
              deadline_at,
              first_seen_at,
              last_seen_at
            )
            VALUES ${rows}
            ON CONFLICT(canonical_url) DO UPDATE SET
              title = excluded.title,
              company = excluded.company,
              detail_url = excluded.detail_url,
              deadline_at = excluded.deadline_at,
              last_seen_at = excluded.last_seen_at,
              first_listed_at = CASE
                WHEN jobs.expired_at IS NOT NULL THEN excluded.last_seen_at
                ELSE jobs.first_listed_at
              END,
              expired_at = CASE
                WHEN jobs.deleted_at IS NULL THEN NULL
                ELSE jobs.expired_at
              END,
              expiry_reason = CASE
                WHEN jobs.deleted_at IS NULL THEN NULL
                ELSE jobs.expiry_reason
              END
          `,
        )
        .bind(...expandedValues),
    );
  }

  statements.push(
    db
      .prepare(
        `
          UPDATE jobs
          SET expired_at = ?, expiry_reason = 'missing-from-official-feed'
          WHERE source_key = 'dhaka-index-feed'
            AND last_seen_at <> ?
            AND expired_at IS NULL
            AND deleted_at IS NULL
        `,
      )
      .bind(input.checkedAt, input.checkedAt),
    db
      .prepare(
        `
          INSERT INTO job_feed_state (
            id,
            feed_url,
            etag,
            last_checked_at,
            last_success_at,
            feed_generated_at,
            last_error
          )
          VALUES (1, ?, ?, ?, ?, ?, NULL)
          ON CONFLICT(id) DO UPDATE SET
            feed_url = excluded.feed_url,
            etag = excluded.etag,
            last_checked_at = excluded.last_checked_at,
            last_success_at = excluded.last_success_at,
            feed_generated_at = excluded.feed_generated_at,
            last_error = NULL
        `,
      )
      .bind(
        input.feedUrl,
        input.etag,
        input.checkedAt,
        input.checkedAt,
        input.feedGeneratedAt,
      ),
  );

  const results = await db.batch(statements);
  const changed = results.reduce(
    (total, result) => total + (result.meta.changes ?? 0),
    0,
  );

  return { changed, received: jobs.length };
}
