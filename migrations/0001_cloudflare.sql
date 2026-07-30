PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expiresAt" DATE NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" DATE,
  "refreshTokenExpiresAt" DATE,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" DATE NOT NULL,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  detail_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL UNIQUE,
  source_key TEXT NOT NULL DEFAULT 'dhaka-index-feed',
  source_name TEXT NOT NULL DEFAULT 'Dhaka Index feed',
  source_kind TEXT NOT NULL DEFAULT 'official-feed',
  source_priority INTEGER NOT NULL DEFAULT 1000,
  discovered_from_url TEXT,
  posted_at TEXT,
  deadline_at TEXT,
  deadline_raw TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  first_listed_at TEXT NOT NULL DEFAULT (datetime('now')),
  expired_at TEXT,
  expiry_reason TEXT,
  admin_title TEXT,
  admin_company TEXT,
  admin_deadline_at TEXT,
  admin_deadline_override INTEGER NOT NULL DEFAULT 0,
  admin_edited_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS resume_profiles (
  id TEXT PRIMARY KEY,
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_user_state (
  user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  bookmarked_at TEXT,
  archived_at TEXT,
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS app_admins (
  user_id TEXT PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  singleton INTEGER NOT NULL DEFAULT 1 UNIQUE CHECK (singleton = 1),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_feed_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  feed_url TEXT,
  etag TEXT,
  last_checked_at TEXT,
  last_success_at TEXT,
  feed_generated_at TEXT,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
CREATE INDEX IF NOT EXISTS "jobs_active_idx" ON jobs (expired_at, deleted_at, first_listed_at DESC);
CREATE INDEX IF NOT EXISTS "job_user_state_user_idx" ON job_user_state (user_id);

CREATE TRIGGER IF NOT EXISTS assign_first_registered_user_as_admin
AFTER INSERT ON "user"
WHEN NOT EXISTS (SELECT 1 FROM app_admins)
BEGIN
  INSERT OR IGNORE INTO app_admins (user_id, singleton, created_at)
  VALUES (NEW.id, 1, datetime('now'));
END;
