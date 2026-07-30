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
