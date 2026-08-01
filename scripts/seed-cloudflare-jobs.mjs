import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  classifyJobFunctions,
  serializeJobFunctions,
} from "../src/lib/job-functions.ts";

const DEFAULT_FEED_URL =
  "https://raw.githubusercontent.com/ananyoshourjo/dhaka-index/jobs-data/jobs.json";
const feedUrl = process.env.DHAKA_INDEX_JOB_FEED_URL?.trim() || DEFAULT_FEED_URL;
const response = await fetch(feedUrl, {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  throw new Error(`Job feed returned HTTP ${response.status}.`);
}

const feed = await response.json();

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
    jobFunctions: serializeJobFunctions(classifyJobFunctions(job.title.trim())),
    url: url.toString(),
  };
});

function sqlValue(value) {
  return value === null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
}

const checkedAt = new Date().toISOString();
const chunks = [];
const chunkSize = 50;

for (let index = 0; index < jobs.length; index += chunkSize) {
  const values = jobs
    .slice(index, index + chunkSize)
    .map(
      (job) =>
        `(${sqlValue(job.title)}, ${sqlValue(job.company)}, ${sqlValue(job.url)}, ` +
        `${sqlValue(job.url)}, ${sqlValue(job.deadline)}, ${sqlValue(job.jobFunctions)}, ${sqlValue(checkedAt)}, ` +
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
SET expired_at = ${sqlValue(checkedAt)},
    expiry_reason = 'missing-from-official-feed'
WHERE source_key = 'dhaka-index-feed'
  AND last_seen_at <> ${sqlValue(checkedAt)}
  AND expired_at IS NULL
  AND deleted_at IS NULL;

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

const temporaryFile = path.join(
  os.tmpdir(),
  `dhaka-index-jobs-${process.pid}-${Date.now()}.sql`,
);
fs.writeFileSync(temporaryFile, chunks.join("\n"), "utf8");

try {
  const wranglerEntrypoint = path.resolve(
    process.cwd(),
    "node_modules",
    "wrangler",
    "bin",
    "wrangler.js",
  );
  const result = spawnSync(
    process.execPath,
    [
      wranglerEntrypoint,
      "d1",
      "execute",
      "dhaka-index",
      "--remote",
      "--file",
      temporaryFile,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "inherit",
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Wrangler exited with status ${result.status ?? "unknown"}.`);
  }
} finally {
  fs.rmSync(temporaryFile, { force: true });
}

console.log(
  `Seeded ${jobs.length} sanitized jobs from feed generated at ${feed.generatedAt}.`,
);
