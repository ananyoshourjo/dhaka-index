import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import jobFunctions from "../src/lib/job-functions.ts";
import feedSchema from "../src/lib/job-feed-schema.ts";
import seedBatches from "../src/lib/job-seed-batches.ts";

const { classifyJobFunctions, serializeJobFunctions } = jobFunctions;

const DEFAULT_FEED_URL =
  "https://raw.githubusercontent.com/ananyoshourjo/dhaka-index/jobs-data/jobs.json";
const feedUrl =
  process.env.DHAKA_INDEX_JOB_FEED_URL?.trim() || DEFAULT_FEED_URL;
const target = process.argv.includes("--local") ? "--local" : "--remote";
const response = await fetch(feedUrl, {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  throw new Error(`Job feed returned HTTP ${response.status}.`);
}

const feed = feedSchema.validateJobFeed(await response.json());

if (
  !feed ||
  feed.schemaVersion !== 1 ||
  feed.license !== "CC0-1.0" ||
  typeof feed.generatedAt !== "string" ||
  !Array.isArray(feed.jobs)
) {
  throw new Error("The public job feed has an unexpected shape.");
}

const seenUrls = new Set();
const jobs = feed.jobs.map((job, index) => {
  if (
    !job ||
    typeof job.title !== "string" ||
    typeof job.company !== "string" ||
    (job.deadline !== null && typeof job.deadline !== "string") ||
    typeof job.url !== "string"
  ) {
    throw new Error(`Job ${index + 1} has an unexpected shape.`);
  }

  const url = new URL(job.url);

  if (url.protocol !== "https:" || seenUrls.has(url.toString())) {
    throw new Error(`Job ${index + 1} has an unsafe or duplicate URL.`);
  }

  seenUrls.add(url.toString());

  return {
    title: job.title.trim(),
    company: job.company.trim(),
    deadline: job.deadline,
    description: job.description ?? null,
    applyUrl: job.applyUrl ?? null,
    applicationInstructions: job.applicationInstructions ?? null,
    contentCheckedAt: job.contentCheckedAt ?? null,
    jobFunctions: serializeJobFunctions(classifyJobFunctions(job.title.trim())),
    url: url.toString(),
  };
});

function sqlValue(value) {
  return value === null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
}

function todayDhaka() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

const checkedAt = new Date().toISOString();
const today = todayDhaka();
const chunks = [];
const chunkSize = 1;

for (let index = 0; index < jobs.length; index += chunkSize) {
  const values = jobs
    .slice(index, index + chunkSize)
    .map(
      (job) =>
        `(${sqlValue(job.title)}, ${sqlValue(job.company)}, ${sqlValue(job.url)}, ` +
        `${sqlValue(job.url)}, ${sqlValue(job.deadline)}, ${sqlValue(job.jobFunctions)}, ${sqlValue(job.description)}, ${sqlValue(job.applyUrl)}, ${sqlValue(job.applicationInstructions)}, ${sqlValue(job.contentCheckedAt)}, ${sqlValue(checkedAt)}, ` +
        `${sqlValue(checkedAt)}, ${sqlValue(checkedAt)})`,
    )
    .join(",\n");

  chunks.push(`
INSERT INTO jobs (
  title,
  company,
  detail_url,
  canonical_url,
  deadline_at,
  job_functions,
  description,
  apply_url,
  application_instructions,
  content_checked_at,
  first_seen_at,
  last_seen_at,
  first_listed_at
)
VALUES
${values}
ON CONFLICT(canonical_url) DO UPDATE SET
  title = excluded.title,
  company = excluded.company,
  detail_url = excluded.detail_url,
  deadline_at = excluded.deadline_at,
  description = excluded.description,
  apply_url = excluded.apply_url,
  application_instructions = excluded.application_instructions,
  content_checked_at = excluded.content_checked_at,
  job_functions = CASE
    WHEN jobs.admin_title IS NULL THEN excluded.job_functions
    ELSE jobs.job_functions
  END,
  last_seen_at = excluded.last_seen_at,
  first_listed_at = CASE
    WHEN jobs.expired_at IS NOT NULL THEN excluded.first_listed_at
    ELSE jobs.first_listed_at
  END,
  expired_at = CASE WHEN jobs.deleted_at IS NULL THEN NULL ELSE jobs.expired_at END,
  expiry_reason = CASE WHEN jobs.deleted_at IS NULL THEN NULL ELSE jobs.expiry_reason END;
`);
}

chunks.push(`
UPDATE jobs
SET expired_at = NULL,
    expiry_reason = NULL
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
  END >= ${sqlValue(today)};

UPDATE jobs
SET expired_at = ${sqlValue(checkedAt)},
    expiry_reason = 'missing-from-official-feed'
WHERE source_key = 'dhaka-index-feed'
  AND last_seen_at <> ${sqlValue(checkedAt)}
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
    END < ${sqlValue(today)}
  );

INSERT INTO job_feed_state (
  id,
  feed_url,
  etag,
  last_checked_at,
  last_success_at,
  feed_generated_at,
  last_error
)
VALUES (
  1,
  ${sqlValue(feedUrl)},
  NULL,
  ${sqlValue(checkedAt)},
  ${sqlValue(checkedAt)},
  ${sqlValue(feed.generatedAt)},
  NULL
)
ON CONFLICT(id) DO UPDATE SET
  feed_url = excluded.feed_url,
  etag = excluded.etag,
  last_checked_at = excluded.last_checked_at,
  last_success_at = excluded.last_success_at,
  feed_generated_at = excluded.feed_generated_at,
  last_error = NULL;
`);

const batches = seedBatches.splitSeedSql(chunks);
const leaseOwner = `job-feed-seed:${randomUUID()}`;
let leaseOwned = false;
const wranglerEntrypoint = path.resolve(
  process.cwd(),
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
function executeSql(sql, json = false) {
  const temporaryFile = path.join(
    os.tmpdir(),
    `dhaka-index-jobs-${process.pid}-${randomUUID()}.sql`,
  );
  fs.writeFileSync(temporaryFile, sql, { encoding: "utf8", flag: "wx" });
  try {
    const result = spawnSync(
      process.execPath,
      [
        wranglerEntrypoint,
        "d1",
        "execute",
        "dhaka-index",
        target,
        ...(json ? ["--command", sql, "--json"] : ["--file", temporaryFile]),
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: json ? ["ignore", "pipe", "pipe"] : "inherit",
        timeout: 120_000,
      },
    );

    if (result.error) throw result.error;

    if (result.status !== 0)
      throw new Error(
        `Wrangler exited with status ${result.status ?? "unknown"}.${json ? ` ${(result.stderr || result.stdout).slice(0, 400)}` : ""}`,
      );
    if (json) {
      const data = JSON.parse(result.stdout);
      if (!Array.isArray(data) || data.some((r) => r.success !== true))
        throw new Error(
          "Incomplete D1 synchronization response; inspect before retrying.",
        );
      return data;
    }
  } finally {
    fs.rmSync(temporaryFile, { force: true });
  }
}
try {
  if (target === "--remote") {
    const now = new Date().toISOString(),
      expires = new Date(Date.now() + 8 * 60_000).toISOString();
    const result = executeSql(
      `INSERT INTO job_feed_sync_lock (id,owner,acquired_at,expires_at) VALUES (1,${sqlValue(leaseOwner)},${sqlValue(now)},${sqlValue(expires)}) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,acquired_at=excluded.acquired_at,expires_at=excluded.expires_at WHERE julianday(job_feed_sync_lock.expires_at)<=julianday(excluded.acquired_at);SELECT owner FROM job_feed_sync_lock WHERE id=1;`,
      true,
    );
    leaseOwned = result.at(-1)?.results?.[0]?.owner === leaseOwner;
    if (!leaseOwned)
      throw new Error(
        "Production feed synchronization is already in progress.",
      );
  }
  for (let index = 0; index < batches.length; index++) {
    if (leaseOwned) {
      const expires = new Date(Date.now() + 8 * 60_000).toISOString();
      const result = executeSql(
        `UPDATE job_feed_sync_lock SET expires_at=${sqlValue(expires)} WHERE id=1 AND owner=${sqlValue(leaseOwner)} AND julianday(expires_at)>julianday('now');SELECT owner FROM job_feed_sync_lock WHERE id=1 AND owner=${sqlValue(leaseOwner)} AND julianday(expires_at)>julianday('now');`,
        true,
      );
      if (result.at(-1)?.results?.[0]?.owner !== leaseOwner)
        throw new Error(
          "Production synchronization lease was lost; stopping without another batch.",
        );
    }
    executeSql(batches[index]);
    console.log(`Imported job batch ${index + 1}/${batches.length}.`);
  }
} finally {
  if (leaseOwned)
    executeSql(
      `DELETE FROM job_feed_sync_lock WHERE id=1 AND owner=${sqlValue(leaseOwner)};`,
      true,
    );
}

console.log(
  `Seeded ${jobs.length} sanitized jobs into ${target === "--local" ? "local" : "remote"} D1 from feed generated at ${feed.generatedAt}.`,
);
