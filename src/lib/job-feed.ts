import "server-only";

import {
  db,
  expireMissingSourceJobs,
  initDb,
  upsertOfficialFeedJob,
} from "@/lib/db";
import { validateJobFeed } from "@/lib/job-feed-schema";
import { nowDhakaIso } from "@/lib/time";

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_FEED_BYTES = 5 * 1024 * 1024;

export type JobFeedStatus = {
  configured: boolean;
  feedUrl: string | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  feedGeneratedAt: string | null;
  lastError: string | null;
};

type JobFeedStateRow = {
  feed_url: string | null;
  etag: string | null;
  last_checked_at: string | null;
  last_success_at: string | null;
  feed_generated_at: string | null;
  last_error: string | null;
};

function getConfiguredFeedUrl() {
  const value = process.env.DHAKA_INDEX_JOB_FEED_URL?.trim();

  if (!value) {
    return null;
  }

  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("DHAKA_INDEX_JOB_FEED_URL must use HTTPS.");
  }

  return url.toString();
}

function readState() {
  initDb();
  return (
    db
      .prepare<unknown[], JobFeedStateRow>(
        `SELECT * FROM job_feed_state WHERE id = 1`,
      )
      .get() ?? null
  );
}

function publicStatus(
  configuredUrl: string | null,
  state: JobFeedStateRow | null,
): JobFeedStatus {
  return {
    configured: Boolean(configuredUrl),
    feedUrl: configuredUrl,
    lastCheckedAt: state?.last_checked_at ?? null,
    lastSuccessAt: state?.last_success_at ?? null,
    feedGeneratedAt: state?.feed_generated_at ?? null,
    lastError: state?.last_error ?? null,
  };
}

function saveState(input: {
  feedUrl: string;
  etag: string | null;
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  feedGeneratedAt: string | null;
  lastError: string | null;
}) {
  db.prepare(`
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
  `).run(
    input.feedUrl,
    input.etag,
    input.lastCheckedAt,
    input.lastSuccessAt,
    input.feedGeneratedAt,
    input.lastError,
  );
}

export function getJobFeedStatus() {
  let configuredUrl: string | null = null;

  try {
    configuredUrl = getConfiguredFeedUrl();
  } catch (error) {
    return {
      ...publicStatus(null, readState()),
      lastError: error instanceof Error ? error.message : String(error),
    };
  }

  return publicStatus(configuredUrl, readState());
}

export async function syncJobFeed(options: { force?: boolean } = {}) {
  const feedUrl = getConfiguredFeedUrl();
  const state = readState();

  if (!feedUrl) {
    return publicStatus(null, state);
  }

  if (
    !options.force &&
    state?.last_checked_at &&
    Date.now() - new Date(state.last_checked_at).getTime() < CHECK_INTERVAL_MS
  ) {
    return publicStatus(feedUrl, state);
  }

  const checkedAt = nowDhakaIso();

  try {
    const response = await fetch(feedUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(state?.etag ? { "If-None-Match": state.etag } : {}),
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status === 304) {
      saveState({
        feedUrl,
        etag: state?.etag ?? null,
        lastCheckedAt: checkedAt,
        lastSuccessAt: checkedAt,
        feedGeneratedAt: state?.feed_generated_at ?? null,
        lastError: null,
      });
      return getJobFeedStatus();
    }

    if (!response.ok) {
      throw new Error(`Job feed returned HTTP ${response.status}.`);
    }

    const contentLength = Number(response.headers.get("content-length") || 0);

    if (contentLength > MAX_FEED_BYTES) {
      throw new Error("The job feed is larger than the allowed limit.");
    }

    const body = await response.text();

    if (Buffer.byteLength(body, "utf8") > MAX_FEED_BYTES) {
      throw new Error("The job feed is larger than the allowed limit.");
    }

    const feed = validateJobFeed(JSON.parse(body) as unknown);
    let inserted = 0;
    let updated = 0;
    let resurfaced = 0;

    const applyFeed = db.transaction(() => {
      for (const job of feed.jobs) {
        const result = upsertOfficialFeedJob({
          title: job.title,
          company: job.company,
          deadlineAt: job.deadline,
          canonicalUrl: job.url,
        });

        if (result.inserted) inserted += 1;
        if (result.updated) updated += 1;
        if (result.resurfaced) resurfaced += 1;
      }

      const expired = expireMissingSourceJobs(
        "dhaka-index-feed",
        feed.jobs.map((job) => job.url),
        "missing-from-official-feed",
      );

      saveState({
        feedUrl,
        etag: response.headers.get("etag"),
        lastCheckedAt: checkedAt,
        lastSuccessAt: checkedAt,
        feedGeneratedAt: feed.generatedAt,
        lastError: null,
      });

      return { inserted, updated, resurfaced, expired };
    });

    return {
      ...getJobFeedStatus(),
      changes: applyFeed(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    saveState({
      feedUrl,
      etag: state?.etag ?? null,
      lastCheckedAt: checkedAt,
      lastSuccessAt: state?.last_success_at ?? null,
      feedGeneratedAt: state?.feed_generated_at ?? null,
      lastError: message,
    });
    throw error;
  }
}
