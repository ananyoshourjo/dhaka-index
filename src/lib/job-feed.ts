import "server-only";

import {
  acquireJobFeedSyncLease,
  applyOfficialFeed,
  getJobFeedState,
  releaseJobFeedSyncLease,
  restoreMissingFeedJobsWithFutureDeadline,
  saveJobFeedState,
  type JobFeedStateRow,
} from "@/lib/cloud-db";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { validateJobFeed } from "@/lib/job-feed-schema";
import { classifyJobFunctions } from "@/lib/job-functions";
import { nowDhakaIso } from "@/lib/time";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const SYNC_LEASE_MS = 2 * 60 * 1000;
const MAX_FEED_BYTES = 5 * 1024 * 1024;

export type JobFeedStatus = {
  configured: boolean;
  feedUrl: string | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  feedGeneratedAt: string | null;
  lastError: string | null;
};

function getConfiguredFeedUrl() {
  const value = getCloudflareEnv().DHAKA_INDEX_JOB_FEED_URL?.trim();

  if (!value) {
    return null;
  }

  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("DHAKA_INDEX_JOB_FEED_URL must use HTTPS.");
  }

  return url.toString();
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

export async function getJobFeedStatus() {
  const state = await getJobFeedState();

  try {
    return publicStatus(getConfiguredFeedUrl(), state);
  } catch (error) {
    return {
      ...publicStatus(null, state),
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function syncJobFeed(options: { force?: boolean } = {}) {
  const feedUrl = getConfiguredFeedUrl();
  let state = await getJobFeedState();

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

  const leaseOwner = crypto.randomUUID();
  const acquiredAt = new Date().toISOString();
  const leaseAcquired = await acquireJobFeedSyncLease({
    owner: leaseOwner,
    acquiredAt,
    expiresAt: new Date(Date.now() + SYNC_LEASE_MS).toISOString(),
  });

  if (!leaseAcquired) {
    return {
      ...publicStatus(feedUrl, state),
      skipped: "sync-in-progress" as const,
    };
  }

  state = await getJobFeedState();

  if (
    !options.force &&
    state?.last_checked_at &&
    Date.now() - new Date(state.last_checked_at).getTime() < CHECK_INTERVAL_MS
  ) {
    await releaseJobFeedSyncLease(leaseOwner);
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
      await restoreMissingFeedJobsWithFutureDeadline();
      await saveJobFeedState({
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
    const changes = await applyOfficialFeed(
      feed.jobs.map((job) => ({
        title: job.title,
        company: job.company,
        deadlineAt: job.deadline,
        canonicalUrl: job.url,
        jobFunctions: classifyJobFunctions(job.title),
      })),
      {
        checkedAt,
        etag: response.headers.get("etag"),
        feedGeneratedAt: feed.generatedAt,
        feedUrl,
      },
    );

    return { ...(await getJobFeedStatus()), changes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await saveJobFeedState({
      feedUrl,
      etag: state?.etag ?? null,
      lastCheckedAt: checkedAt,
      lastSuccessAt: state?.last_success_at ?? null,
      feedGeneratedAt: state?.feed_generated_at ?? null,
      lastError: message,
    });
    throw error;
  } finally {
    await releaseJobFeedSyncLease(leaseOwner).catch(() => undefined);
  }
}
