import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("cloud schema assigns only the first registered user as administrator", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "migrations", "0001_cloudflare.sql"),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE TRIGGER IF NOT EXISTS assign_first_registered_user_as_admin/,
  );
  assert.match(migration, /AFTER INSERT ON "user"/);
  assert.match(migration, /WHEN NOT EXISTS \(SELECT 1 FROM app_admins\)/);
  assert.match(
    migration,
    /singleton INTEGER NOT NULL DEFAULT 1 UNIQUE CHECK \(singleton = 1\)/,
  );
});

test("cloud schema keeps user data separate from the public job seed", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "migrations", "0001_cloudflare.sql"),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS resume_profiles/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS job_user_state/);
  assert.doesNotMatch(migration, /INSERT INTO "user"/);
  assert.doesNotMatch(migration, /INSERT INTO resume_profiles/);
});

test("scheduled synchronization uses an expiring singleton lease", () => {
  const migration = fs.readFileSync(
    path.join(
      process.cwd(),
      "migrations",
      "0002_job_feed_sync_lock.sql",
    ),
    "utf8",
  );
  const cloudDb = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "cloud-db.ts"),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS job_feed_sync_lock/);
  assert.match(migration, /PRIMARY KEY CHECK \(id = 1\)/);
  assert.match(cloudDb, /WHERE job_feed_sync_lock\.expires_at <= excluded\.acquired_at/);
  assert.match(cloudDb, /DELETE FROM job_feed_sync_lock WHERE id = 1 AND owner = \?/);
});

test("Cloudflare Worker schedules an authenticated forced feed refresh", () => {
  const worker = fs.readFileSync(
    path.join(process.cwd(), "custom-worker.ts"),
    "utf8",
  );
  const config = fs.readFileSync(
    path.join(process.cwd(), "wrangler.example.jsonc"),
    "utf8",
  );
  const route = fs.readFileSync(
    path.join(
      process.cwd(),
      "src",
      "app",
      "api",
      "jobs",
      "sync",
      "route.ts",
    ),
    "utf8",
  );

  assert.match(worker, /async scheduled/);
  assert.match(worker, /X-Dhaka-Index-Sync-Key/);
  assert.match(worker, /X-Dhaka-Index-Sync-Source/);
  assert.match(config, /"\*\/30 \* \* \* \*"/);
  assert.match(route, /syncJobFeed\(\{ force: scheduled \}\)/);
});
