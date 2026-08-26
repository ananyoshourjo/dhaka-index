import "server-only";

import { getCloudflareDb } from "@/lib/cloudflare";
import { JOBS_PAGE_SIZE, type ActiveJobFilters } from "@/lib/job-search";
import { parseJobFunctions, type JobFunction } from "@/lib/job-functions";
import { nowDhakaIso, todayDhaka } from "@/lib/time";

export type ActiveJob = {
  id: number;
  title: string;
  company: string;
  deadlineAt: string | null;
  detailUrl: string;
  bookmarkedAt: string | null;
  jobFunctions: JobFunction[];
};

type ActiveJobDbRow = Omit<ActiveJob, "jobFunctions"> & {
  jobFunctionsSerialized: string;
};

export type ActiveJobPage = {
  currentPage: number;
  jobs: ActiveJob[];
  totalPages: number;
};

export type OfficialFeedJob = {
  title: string;
  company: string;
  deadlineAt: string | null;
  canonicalUrl: string;
  jobFunctions: JobFunction[];
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
      .prepare(`DELETE FROM profile_photos WHERE user_id = ?`)
      .bind(userId),
    db
      .prepare(`DELETE FROM app_admins WHERE user_id = ?`)
      .bind(userId),
  ]);
}

export async function getUserDataExport(userId: string) {
  const [user, resume, profilePhoto, jobState] = await Promise.all([
    statement(
      `
        SELECT id, name, email, "emailVerified", image, "preferredJobFunction", "createdAt", "updatedAt"
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
      `SELECT image_blob, content_type, legacy_data_url, updated_at FROM profile_photos WHERE user_id = ?`,
      [userId],
    ).first<{
      image_blob: ArrayBuffer | null;
      content_type: string | null;
      legacy_data_url: string | null;
      updated_at: string;
    }>(),
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
    profilePhoto: profilePhoto
      ? {
          contentType: profilePhoto.content_type,
          dataUrl:
            profilePhoto.legacy_data_url ??
            `data:${profilePhoto.content_type};base64,${Buffer.from(profilePhoto.image_blob!).toString("base64")}`,
          updatedAt: profilePhoto.updated_at,
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
        jobs.job_functions AS jobFunctionsSerialized,
        state.bookmarked_at AS bookmarkedAt
      ${fromClause}
      WHERE ${modeFilter}
        AND jobs.expired_at IS NULL
        AND jobs.deleted_at IS NULL
      ORDER BY ${orderBy}
    `,
    [userId],
  ).all<ActiveJobDbRow>();

  return result.results.map(({ jobFunctionsSerialized, ...job }) => ({
    ...job,
    jobFunctions: parseJobFunctions(jobFunctionsSerialized),
  }));
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function getActiveJobsPageFromDb(
  userId: string,
  filters: ActiveJobFilters,
): Promise<ActiveJobPage> {
  const conditions = [
    `state.archived_at IS NULL`,
    `jobs.expired_at IS NULL`,
    `jobs.deleted_at IS NULL`,
  ];
  const values: unknown[] = [userId];

  if (filters.query) {
    const pattern = `%${escapeLike(filters.query.toLowerCase())}%`;
    conditions.push(`
      (
        LOWER(COALESCE(jobs.admin_title, jobs.title)) LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(jobs.admin_company, jobs.company)) LIKE ? ESCAPE '\\'
        OR LOWER(jobs.job_functions) LIKE ? ESCAPE '\\'
      )
    `);
    values.push(pattern, pattern, pattern);
  }

  if (filters.jobFunction) {
    conditions.push(`instr(jobs.job_functions, ?) > 0`);
    values.push(`|${filters.jobFunction}|`);
  }

  const fromAndWhereSql = `
    FROM jobs
    LEFT JOIN job_user_state AS state
      ON state.job_id = jobs.id
      AND state.user_id = ?
    WHERE ${conditions.join("\nAND ")}
  `;
  const count = await statement(
    `SELECT COUNT(*) AS total ${fromAndWhereSql}`,
    values,
  ).first<{ total: number }>();
  const totalPages = Math.ceil((count?.total ?? 0) / JOBS_PAGE_SIZE);
  const currentPage = Math.min(filters.page, Math.max(totalPages, 1));
  const offset = (currentPage - 1) * JOBS_PAGE_SIZE;

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
        jobs.job_functions AS jobFunctionsSerialized,
        state.bookmarked_at AS bookmarkedAt
      ${fromAndWhereSql}
      ORDER BY jobs.first_listed_at DESC, jobs.id DESC
      LIMIT ?
      OFFSET ?
    `,
    [...values, JOBS_PAGE_SIZE, offset],
  ).all<ActiveJobDbRow>();

  const jobs = result.results.map(
    ({ jobFunctionsSerialized, ...job }) => ({
      ...job,
      jobFunctions: parseJobFunctions(jobFunctionsSerialized),
    }),
  );

  return {
    currentPage,
    jobs,
    totalPages,
  };
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
  // Keep each statement below D1's 100-bound-parameter limit (12 x 8 = 96).
  const chunkSize = 12;

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
          `|${job.jobFunctions.join("|")}|`,
          input.checkedAt,
          input.checkedAt,
        );
        return `(?, ?, ?, ?, ?, ?, ?, ?)`;
      })
      .join(", ");

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
              job_functions,
              first_seen_at,
              last_seen_at
            )
            VALUES ${rows}
            ON CONFLICT(canonical_url) DO UPDATE SET
              title = excluded.title,
              company = excluded.company,
              detail_url = excluded.detail_url,
              deadline_at = excluded.deadline_at,
              job_functions = CASE
                WHEN jobs.admin_title IS NULL THEN excluded.job_functions
                ELSE jobs.job_functions
              END,
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
              WHERE jobs.source_key = 'dhaka-index-feed'
          `,
        )
        .bind(...values),
    );
  }

  statements.push(
    db
      .prepare(
        `
          UPDATE jobs
          SET expired_at = NULL, expiry_reason = NULL
          WHERE source_key = 'dhaka-index-feed'
            AND expired_at IS NOT NULL
            AND deleted_at IS NULL
            AND expiry_reason IN (
              'missing-from-official-feed',
              'missing-from-complete-source-crawl'
            )
            AND CASE
              WHEN admin_deadline_override = 1 THEN admin_deadline_at
              ELSE deadline_at
            END IS NOT NULL
            AND CASE
              WHEN admin_deadline_override = 1 THEN admin_deadline_at
              ELSE deadline_at
            END >= ?
        `,
      )
      .bind(todayDhaka()),
    db
      .prepare(
        `
          UPDATE jobs
          SET expired_at = ?, expiry_reason = 'missing-from-official-feed'
          WHERE source_key = 'dhaka-index-feed'
            AND last_seen_at <> ?
            AND expired_at IS NULL
            AND deleted_at IS NULL
            AND (
              CASE
                WHEN admin_deadline_override = 1 THEN admin_deadline_at
                ELSE deadline_at
              END IS NULL
              OR CASE
                WHEN admin_deadline_override = 1 THEN admin_deadline_at
                ELSE deadline_at
              END < ?
            )
        `,
      )
      .bind(input.checkedAt, input.checkedAt, todayDhaka()),
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
