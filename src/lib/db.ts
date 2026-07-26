import Database from "better-sqlite3";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { getDataDirectory } from "@/lib/data-path";
import { addDaysToDateOnly, nowDhakaIso, todayDhaka } from "@/lib/time";

export type JobRow = {
  id: number;
  title: string;
  company: string;
  detail_url: string;
  canonical_url: string;
  source_key: string;
  source_name: string;
  source_kind: string;
  source_priority: number;
  discovered_from_url: string | null;
  posted_at: string | null;
  deadline_at: string | null;
  deadline_raw: string | null;
  first_seen_at: string;
  last_seen_at: string;
  first_listed_at: string;
  expired_at: string | null;
  expiry_reason: string | null;
  bookmarked_at: string | null;
  admin_title: string | null;
  admin_company: string | null;
  admin_deadline_at: string | null;
  admin_deadline_override: number;
  admin_edited_at: string | null;
  deleted_at: string | null;
};

export type JobInput = {
  title: string;
  company: string;
  detailUrl: string;
  canonicalUrl: string;
  sourceKey: string;
  sourceName: string;
  sourceKind: string;
  sourcePriority: number;
  discoveredFromUrl: string | null;
  postedAt: string | null;
  deadlineAt: string | null;
  deadlineRaw: string | null;
};

export type OfficialFeedJob = {
  title: string;
  company: string;
  deadlineAt: string | null;
  canonicalUrl: string;
};

export type ActiveJob = {
  id: number;
  title: string;
  company: string;
  deadlineAt: string | null;
  detailUrl: string;
  bookmarkedAt: string | null;
};

export type SourceState = {
  source_key: string;
  source_name: string;
  is_initialized: number;
  last_crawled_at: string | null;
  last_status: string | null;
  last_error: string | null;
};

function shouldKeepExpired(existing: JobRow, incoming: JobInput) {
  if (existing.expired_at === null) {
    return false;
  }

  if (
    existing.expiry_reason === "deduped" ||
    existing.expiry_reason === "bdrecruit-legacy-url" ||
    existing.expiry_reason === "cv-guy-ambiguous"
  ) {
    return true;
  }

  const effectiveDeadline = existing.admin_deadline_override
    ? existing.admin_deadline_at
    : incoming.deadlineAt ?? existing.deadline_at;

  return Boolean(effectiveDeadline && effectiveDeadline < todayDhaka());
}

function isWeakTitle(title: string) {
  return (
    /^(view details|apply now|more details|full job description)$/i.test(title) ||
    title.length > 120
  );
}

function shouldPreferIncomingTitle(existingTitle: string, incomingTitle: string) {
  if (!incomingTitle) {
    return false;
  }

  if (isWeakTitle(existingTitle) && !isWeakTitle(incomingTitle)) {
    return true;
  }

  if (existingTitle.length > incomingTitle.length && !isWeakTitle(incomingTitle)) {
    return true;
  }

  return false;
}

function shouldPreferIncomingCompany(existingCompany: string, incomingCompany: string) {
  if (!incomingCompany) {
    return false;
  }

  if (existingCompany === incomingCompany) {
    return false;
  }

  if (isLikelyInvalidCompany(existingCompany)) {
    return true;
  }

  if (existingCompany === "The CV Guy" && incomingCompany !== existingCompany) {
    return true;
  }

  return false;
}

function isLikelyInvalidCompany(company: string) {
  return (
    /^bdrecruit(?:\.net)?$/i.test(company) ||
    company.toLowerCase() === "jobs" ||
    /\b(manager|assistant|executive|officer|analyst|engineer|developer|specialist|partner|coordinator|lead|head|intern|trainee|business|quality|manufacturing|operations|representative)\b/i.test(
      company,
    )
  );
}

function isCvGuyArticleUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.hostname === "thecvguy.net" || url.hostname.endsWith(".thecvguy.net");
  } catch {
    return false;
  }
}

function shouldPreferIncomingDetailUrl(existing: JobRow, incoming: JobInput) {
  return (
    incoming.sourceKind === "cv-guy" &&
    isCvGuyArticleUrl(incoming.detailUrl) &&
    !isCvGuyArticleUrl(existing.detail_url)
  );
}

function isLikelyInvalidCvGuyCompany(company: string) {
  return (
    company === "The CV Guy" ||
    company === "Hiring Company" ||
    /^(?:bdrecruit(?:\.net)?|bdjobs(?:\.com)?)$/i.test(company) ||
    /\b(aspire|finternship|n-risers|internship program|graduate program|management trainee)\b/i.test(
      company,
    ) ||
    /\b(manager|assistant|executive|officer|analyst|engineer|developer|specialist|partner|coordinator|lead|head|intern|trainee|business|quality|manufacturing|operations)\b/i.test(
      company,
    )
  );
}

function normalizeCompanyForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(
      /\b(ltd|ltd\.|limited|plc|plc\.|inc|inc\.|company|communications|operations|bangladesh)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/\bref\.?.*$/g, " ")
    .replace(/\|\s*20\d{2}.*/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeDuplicate(existing: JobRow, incoming: JobInput) {
  const existingCompany = normalizeCompanyForMatch(existing.company);
  const incomingCompany = normalizeCompanyForMatch(incoming.company);
  const existingTitle = normalizeTitleForMatch(existing.title);
  const incomingTitle = normalizeTitleForMatch(incoming.title);

  if (!existingTitle || !incomingTitle) {
    return false;
  }

  const companyMatches =
    existingCompany === incomingCompany ||
    existingCompany.includes(incomingCompany) ||
    incomingCompany.includes(existingCompany);

  const titleMatches =
    existingTitle === incomingTitle ||
    existingTitle.includes(incomingTitle) ||
    incomingTitle.includes(existingTitle);

  if (
    (existing.company === "The CV Guy" || incoming.company === "The CV Guy") &&
    existingTitle === incomingTitle
  ) {
    return true;
  }

  return companyMatches && titleMatches;
}

const dataDir = getDataDirectory();
const dbPath = path.join(dataDir, "dhaka-index.db");
const initialAdminCodePath = path.join(dataDir, "initial-admin-code.txt");
const INITIAL_ADMIN_CODE_SETTING = "initial_admin_code_hash";
let initialAdminCodeLogged = false;

fs.mkdirSync(dataDir, { recursive: true });

const globalForDb = globalThis as typeof globalThis & {
  __dhakaIndexDb?: Database.Database;
};

export const db =
  globalForDb.__dhakaIndexDb ??
  new Database(dbPath, {
    fileMustExist: false,
  });

if (!globalForDb.__dhakaIndexDb) {
  globalForDb.__dhakaIndexDb = db;
}

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 30000");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      detail_url TEXT NOT NULL,
      canonical_url TEXT NOT NULL UNIQUE,
      source_key TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      source_priority INTEGER NOT NULL,
      discovered_from_url TEXT,
      posted_at TEXT,
      deadline_at TEXT,
      deadline_raw TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      first_listed_at TEXT NOT NULL,
      expired_at TEXT,
      expiry_reason TEXT,
      bookmarked_at TEXT,
      admin_title TEXT,
      admin_company TEXT,
      admin_deadline_at TEXT,
      admin_deadline_override INTEGER NOT NULL DEFAULT 0,
      admin_edited_at TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS source_state (
      source_key TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      is_initialized INTEGER NOT NULL DEFAULT 0,
      last_crawled_at TEXT,
      last_status TEXT,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS crawl_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      summary TEXT
    );

    CREATE TABLE IF NOT EXISTS resume_profiles (
      id TEXT PRIMARY KEY,
      content_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_user_state (
      user_id TEXT NOT NULL,
      job_id INTEGER NOT NULL,
      bookmarked_at TEXT,
      archived_at TEXT,
      PRIMARY KEY (user_id, job_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_admins (
      user_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES "user" ("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

    CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
    CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
    CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
  `);

  db.exec(`
    INSERT INTO resume_profiles (id, content_json, updated_at)
    SELECT 'profile:' || substr(id, 7), content_json, updated_at
    FROM resume_profiles
    WHERE id LIKE 'apply:%'
    ON CONFLICT(id) DO UPDATE SET
      content_json = excluded.content_json,
      updated_at = excluded.updated_at;

    UPDATE "user"
    SET "image" = (
      SELECT NULLIF(json_extract(content_json, '$.contact.photoUrl'), '')
      FROM resume_profiles
      WHERE id = 'apply:' || "user"."id"
    )
    WHERE EXISTS (
      SELECT 1
      FROM resume_profiles
      WHERE id = 'apply:' || "user"."id"
    );

    DELETE FROM resume_profiles WHERE id LIKE 'apply:%';
  `);

  const columns = db.prepare(`PRAGMA table_info(jobs)`).all() as Array<{
    name: string;
  }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("bookmarked_at")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN bookmarked_at TEXT`);
  }

  if (!columnNames.has("expired_at")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN expired_at TEXT`);
  }

  if (!columnNames.has("expiry_reason")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN expiry_reason TEXT`);
  }

  if (!columnNames.has("admin_title")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_title TEXT`);
  }

  if (!columnNames.has("admin_company")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_company TEXT`);
  }

  if (!columnNames.has("admin_deadline_at")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_deadline_at TEXT`);
  }

  if (!columnNames.has("admin_deadline_override")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_deadline_override INTEGER NOT NULL DEFAULT 0`);
  }

  if (!columnNames.has("admin_edited_at")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_edited_at TEXT`);
  }

  if (!columnNames.has("deleted_at")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN deleted_at TEXT`);
  }

  if (columnNames.has("archived_at")) {
    db.exec(`
      UPDATE jobs
      SET expired_at = COALESCE(expired_at, archived_at)
      WHERE archived_at IS NOT NULL
    `);
    db.exec(`ALTER TABLE jobs DROP COLUMN archived_at`);
  }

  if (columnNames.has("archive_reason")) {
    db.exec(`
      UPDATE jobs
      SET expiry_reason = COALESCE(expiry_reason, archive_reason)
      WHERE archive_reason IS NOT NULL
    `);
    db.exec(`ALTER TABLE jobs DROP COLUMN archive_reason`);
  }

}

function hashSetupCode(code: string) {
  return createHash("sha256").update(code.trim(), "utf8").digest("hex");
}

function readSetting(key: string) {
  return (
    db
      .prepare<[string], { value: string }>(
        `SELECT value FROM app_settings WHERE key = ?`,
      )
      .get(key)?.value ?? null
  );
}

function writeSetting(key: string, value: string) {
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(key, value, nowDhakaIso());
}

function ensureInitialAdminSetupState() {
  const adminCount = db
    .prepare<unknown[], { count: number }>(
      `SELECT COUNT(*) AS count FROM app_admins`,
    )
    .get()?.count ?? 0;

  if (adminCount > 0) {
    db.prepare(`DELETE FROM app_settings WHERE key = ?`).run(
      INITIAL_ADMIN_CODE_SETTING,
    );
    fs.rmSync(initialAdminCodePath, { force: true });
    return;
  }

  let code = fs.existsSync(initialAdminCodePath)
    ? fs.readFileSync(initialAdminCodePath, "utf8").trim()
    : "";
  const storedHash = readSetting(INITIAL_ADMIN_CODE_SETTING);

  if (!code || !storedHash || hashSetupCode(code) !== storedHash) {
    code = randomBytes(9).toString("base64url").toUpperCase();
    fs.writeFileSync(initialAdminCodePath, `${code}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    writeSetting(INITIAL_ADMIN_CODE_SETTING, hashSetupCode(code));
  }

  if (!initialAdminCodeLogged) {
    console.warn(
      `\n[Dhaka Index] Initial administrator setup code: ${code}\n` +
        "The first registered user must enter this code to claim administrator access.\n",
    );
    initialAdminCodeLogged = true;
  }
}

export function hasAnyAdmin() {
  initDb();
  return Boolean(
    db
      .prepare(`SELECT 1 FROM app_admins LIMIT 1`)
      .get(),
  );
}

export function ensureAdminSetupAvailable() {
  initDb();
  ensureInitialAdminSetupState();
}

export function isAdmin(userId: string) {
  initDb();
  return Boolean(
    db
      .prepare<[string]>(`SELECT 1 FROM app_admins WHERE user_id = ?`)
      .get(userId),
  );
}

export function isFirstRegisteredUser(userId: string) {
  initDb();
  const firstUser = db
    .prepare<unknown[], { id: string }>(
      `SELECT id FROM "user" ORDER BY "createdAt" ASC, id ASC LIMIT 1`,
    )
    .get();

  return firstUser?.id === userId;
}

export function claimInitialAdmin(userId: string, rawCode: string) {
  initDb();

  const claim = db.transaction(() => {
    if (db.prepare(`SELECT 1 FROM app_admins LIMIT 1`).get()) {
      throw new Error("An administrator has already been configured.");
    }

    const firstUser = db
      .prepare<unknown[], { id: string }>(
        `SELECT id FROM "user" ORDER BY "createdAt" ASC, id ASC LIMIT 1`,
      )
      .get();

    if (!firstUser || firstUser.id !== userId) {
      throw new Error("Only the first registered user can claim administrator access.");
    }

    const storedHash = readSetting(INITIAL_ADMIN_CODE_SETTING);
    const submittedHash = hashSetupCode(rawCode);

    if (!storedHash) {
      throw new Error("The administrator setup code is unavailable.");
    }

    const storedBuffer = Buffer.from(storedHash, "hex");
    const submittedBuffer = Buffer.from(submittedHash, "hex");

    if (
      storedBuffer.length !== submittedBuffer.length ||
      !timingSafeEqual(storedBuffer, submittedBuffer)
    ) {
      throw new Error("The administrator setup code is incorrect.");
    }

    db.prepare(`
      INSERT INTO app_admins (user_id, created_at)
      VALUES (?, ?)
    `).run(userId, nowDhakaIso());
    db.prepare(`DELETE FROM app_settings WHERE key = ?`).run(
      INITIAL_ADMIN_CODE_SETTING,
    );
  });

  claim();
  fs.rmSync(initialAdminCodePath, { force: true });
}

export function cleanupUserData(userId: string) {
  initDb();
  db.transaction(() => {
    db.prepare(`DELETE FROM job_user_state WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM resume_profiles WHERE id = ?`).run(
      `profile:${userId}`,
    );
    db.prepare(`DELETE FROM app_admins WHERE user_id = ?`).run(userId);
  })();
}

export function getUserDataExport(userId: string) {
  initDb();
  const user = db
    .prepare<[string]>(
      `
        SELECT id, name, email, "emailVerified", image, "createdAt", "updatedAt"
        FROM "user"
        WHERE id = ?
      `,
    )
    .get(userId);
  const resume = db
    .prepare<[string], { content_json: string; updated_at: string }>(
      `SELECT content_json, updated_at FROM resume_profiles WHERE id = ?`,
    )
    .get(`profile:${userId}`);
  const jobState = db
    .prepare<[string]>(
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
    )
    .all(userId);

  return {
    exportedAt: new Date().toISOString(),
    user,
    resume: resume
      ? {
          content: JSON.parse(resume.content_json) as unknown,
          updatedAt: resume.updated_at,
        }
      : null,
    jobState,
  };
}

export function createCrawlRun() {
  const startedAt = nowDhakaIso();
  const statement = db.prepare(`
    INSERT INTO crawl_runs (started_at, status)
    VALUES (?, ?)
  `);

  const result = statement.run(startedAt, "running");
  return Number(result.lastInsertRowid);
}

export function finishCrawlRun(runId: number, status: string, summary: string) {
  db.prepare(`
    UPDATE crawl_runs
    SET finished_at = ?, status = ?, summary = ?
    WHERE id = ?
  `).run(nowDhakaIso(), status, summary, runId);
}

export function getSourceState(sourceKey: string) {
  return (
    db
      .prepare<unknown[], SourceState>(
        `SELECT * FROM source_state WHERE source_key = ?`,
      )
      .get(sourceKey) ?? null
  );
}

export function upsertSourceState(input: {
  sourceKey: string;
  sourceName: string;
  initialized?: boolean;
  lastStatus: string;
  lastError: string | null;
}) {
  db.prepare(`
    INSERT INTO source_state (
      source_key,
      source_name,
      is_initialized,
      last_crawled_at,
      last_status,
      last_error
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_key) DO UPDATE SET
      source_name = excluded.source_name,
      is_initialized = excluded.is_initialized,
      last_crawled_at = excluded.last_crawled_at,
      last_status = excluded.last_status,
      last_error = excluded.last_error
  `).run(
    input.sourceKey,
    input.sourceName,
    input.initialized ? 1 : 0,
    nowDhakaIso(),
    input.lastStatus,
    input.lastError,
  );
}

export function upsertJob(job: JobInput) {
  const now = nowDhakaIso();
  const existing = db
    .prepare<unknown[], JobRow>(`SELECT * FROM jobs WHERE canonical_url = ?`)
    .get(job.canonicalUrl);

  if (existing?.deleted_at) {
    db.prepare(`
      UPDATE jobs
      SET last_seen_at = ?
      WHERE canonical_url = ?
    `).run(now, job.canonicalUrl);

    return { inserted: false, updated: false, suppressedByAdmin: true };
  }

  if (!existing) {
    const similarExisting = db
      .prepare<unknown[], JobRow>(
        `
          SELECT *
          FROM jobs
          WHERE expired_at IS NULL
            AND deleted_at IS NULL
        `,
      )
      .all()
      .find((row) => looksLikeDuplicate(row, job));

    if (similarExisting) {
      const now = nowDhakaIso();
      const preferIncoming =
        job.sourcePriority > similarExisting.source_priority ||
        shouldPreferIncomingTitle(similarExisting.title, job.title) ||
        shouldPreferIncomingDetailUrl(similarExisting, job);

      db.prepare(`
        UPDATE jobs
        SET
          title = ?,
          company = ?,
          detail_url = ?,
          canonical_url = ?,
          source_key = ?,
          source_name = ?,
          source_kind = ?,
          source_priority = ?,
          discovered_from_url = ?,
          posted_at = COALESCE(?, posted_at),
          deadline_at = COALESCE(?, deadline_at),
          deadline_raw = COALESCE(?, deadline_raw),
          last_seen_at = ?
        WHERE id = ?
      `).run(
        preferIncoming ? job.title : similarExisting.title,
        preferIncoming ? job.company : similarExisting.company,
        preferIncoming ? job.detailUrl : similarExisting.detail_url,
        preferIncoming ? job.canonicalUrl : similarExisting.canonical_url,
        preferIncoming ? job.sourceKey : similarExisting.source_key,
        preferIncoming ? job.sourceName : similarExisting.source_name,
        preferIncoming ? job.sourceKind : similarExisting.source_kind,
        preferIncoming ? job.sourcePriority : similarExisting.source_priority,
        preferIncoming ? job.discoveredFromUrl : similarExisting.discovered_from_url,
        job.postedAt,
        job.deadlineAt,
        job.deadlineRaw,
        now,
        similarExisting.id,
      );

      return { inserted: false, updated: true, dedupedBySimilarity: true };
    }

    db.prepare(`
      INSERT INTO jobs (
        title,
        company,
        detail_url,
        canonical_url,
        source_key,
        source_name,
        source_kind,
        source_priority,
        discovered_from_url,
        posted_at,
        deadline_at,
        deadline_raw,
        first_seen_at,
        last_seen_at,
        first_listed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.title,
      job.company,
      job.detailUrl,
      job.canonicalUrl,
      job.sourceKey,
      job.sourceName,
      job.sourceKind,
      job.sourcePriority,
      job.discoveredFromUrl,
      job.postedAt,
      job.deadlineAt,
      job.deadlineRaw,
      now,
      now,
      now,
    );

    return { inserted: true, updated: false };
  }

  const shouldReplace =
    job.sourcePriority > existing.source_priority ||
    shouldPreferIncomingTitle(existing.title, job.title) ||
    shouldPreferIncomingCompany(existing.company, job.company) ||
    shouldPreferIncomingDetailUrl(existing, job) ||
    (!existing.deadline_at && Boolean(job.deadlineAt));
  const keepExpired = shouldKeepExpired(existing, job);
  const activeAgain = existing.expired_at !== null && !keepExpired;

  db.prepare(`
    UPDATE jobs
    SET
      title = ?,
      company = ?,
      detail_url = ?,
      source_key = ?,
      source_name = ?,
      source_kind = ?,
      source_priority = ?,
      discovered_from_url = ?,
      posted_at = COALESCE(?, posted_at),
      deadline_at = COALESCE(?, deadline_at),
      deadline_raw = COALESCE(?, deadline_raw),
      last_seen_at = ?,
      first_listed_at = CASE
        WHEN ? THEN ?
        ELSE first_listed_at
      END,
      expired_at = CASE
        WHEN expired_at IS NOT NULL AND ? THEN expired_at
        ELSE NULL
      END,
      expiry_reason = CASE
        WHEN expired_at IS NOT NULL AND ? THEN expiry_reason
        ELSE NULL
      END
    WHERE canonical_url = ?
  `).run(
    shouldReplace ? job.title : existing.title,
    shouldReplace ? job.company : existing.company,
    shouldReplace ? job.detailUrl : existing.detail_url,
    shouldReplace ? job.sourceKey : existing.source_key,
    shouldReplace ? job.sourceName : existing.source_name,
    shouldReplace ? job.sourceKind : existing.source_kind,
    shouldReplace ? job.sourcePriority : existing.source_priority,
    shouldReplace ? job.discoveredFromUrl : existing.discovered_from_url,
    job.postedAt,
    job.deadlineAt,
    job.deadlineRaw,
    now,
    activeAgain ? 1 : 0,
    now,
    keepExpired ? 1 : 0,
    keepExpired ? 1 : 0,
    job.canonicalUrl,
  );

  return { inserted: false, updated: true, resurfaced: activeAgain };
}

export function upsertOfficialFeedJob(job: OfficialFeedJob) {
  const now = nowDhakaIso();
  const existing = db
    .prepare<unknown[], JobRow>(`SELECT * FROM jobs WHERE canonical_url = ?`)
    .get(job.canonicalUrl);

  if (existing?.deleted_at) {
    db.prepare(`UPDATE jobs SET last_seen_at = ? WHERE id = ?`).run(
      now,
      existing.id,
    );
    return { inserted: false, updated: false, suppressedByAdmin: true };
  }

  if (!existing) {
    db.prepare(`
      INSERT INTO jobs (
        title,
        company,
        detail_url,
        canonical_url,
        source_key,
        source_name,
        source_kind,
        source_priority,
        discovered_from_url,
        posted_at,
        deadline_at,
        deadline_raw,
        first_seen_at,
        last_seen_at,
        first_listed_at
      )
      VALUES (?, ?, ?, ?, 'dhaka-index-feed', 'Dhaka Index feed',
        'official-feed', 1000, NULL, NULL, ?, NULL, ?, ?, ?)
    `).run(
      job.title,
      job.company,
      job.canonicalUrl,
      job.canonicalUrl,
      job.deadlineAt,
      now,
      now,
      now,
    );

    return { inserted: true, updated: false, resurfaced: false };
  }

  const resurfaced = existing.expired_at !== null;

  db.prepare(`
    UPDATE jobs
    SET
      title = ?,
      company = ?,
      detail_url = ?,
      source_key = 'dhaka-index-feed',
      source_name = 'Dhaka Index feed',
      source_kind = 'official-feed',
      source_priority = 1000,
      discovered_from_url = NULL,
      deadline_at = ?,
      deadline_raw = NULL,
      last_seen_at = ?,
      first_listed_at = CASE WHEN expired_at IS NOT NULL THEN ? ELSE first_listed_at END,
      expired_at = NULL,
      expiry_reason = NULL
    WHERE id = ?
  `).run(
    job.title,
    job.company,
    job.canonicalUrl,
    job.deadlineAt,
    now,
    now,
    existing.id,
  );

  return { inserted: false, updated: true, resurfaced };
}

export function expireMissingSourceJobs(
  sourceKey: string,
  activeCanonicalUrls: string[],
  reason: string,
) {
  const params: Array<string> = [nowDhakaIso(), reason, sourceKey];
  let exclusion = "";

  if (activeCanonicalUrls.length > 0) {
    exclusion = `AND canonical_url NOT IN (${activeCanonicalUrls.map(() => "?").join(", ")})`;
    params.push(...activeCanonicalUrls);
  }

  const result = db.prepare(`
    UPDATE jobs
    SET expired_at = ?, expiry_reason = ?
    WHERE source_key = ?
      AND expired_at IS NULL
      AND deleted_at IS NULL
      ${exclusion}
  `).run(...params);

  return Number(result.changes);
}

export function mergeCrossSourceDuplicates(processedSourceKeys?: Iterable<string>) {
  const rows = db
    .prepare<unknown[], JobRow>(
      `
        SELECT *
        FROM jobs
        WHERE expired_at IS NULL
          AND deleted_at IS NULL
        ORDER BY source_priority DESC, id ASC
      `,
    )
    .all();

  const losers = new Set<number>();

  for (let i = 0; i < rows.length; i += 1) {
    const current = rows[i];
    if (losers.has(current.id)) {
      continue;
    }

    for (let j = i + 1; j < rows.length; j += 1) {
      const candidate = rows[j];
      if (losers.has(candidate.id)) {
        continue;
      }

      if (
        current.canonical_url !== candidate.canonical_url &&
        looksLikeDuplicate(current, {
          title: candidate.title,
          company: candidate.company,
          detailUrl: candidate.detail_url,
          canonicalUrl: candidate.canonical_url,
          sourceKey: candidate.source_key,
          sourceName: candidate.source_name,
          sourceKind: candidate.source_kind,
          sourcePriority: candidate.source_priority,
          discoveredFromUrl: candidate.discovered_from_url,
          postedAt: candidate.posted_at,
          deadlineAt: candidate.deadline_at,
          deadlineRaw: candidate.deadline_raw,
        })
      ) {
        const keepCurrent =
          current.source_priority > candidate.source_priority ||
          (current.source_priority === candidate.source_priority &&
            current.source_name !== "The CV Guy");

        losers.add(keepCurrent ? candidate.id : current.id);
        if (!keepCurrent) {
          break;
        }
      }
    }
  }

  const allowedSourceKeys = processedSourceKeys
    ? new Set(processedSourceKeys)
    : null;
  const sourceKeyById = new Map(rows.map((row) => [row.id, row.source_key]));
  const ids = Array.from(losers).filter(
    (id) => !allowedSourceKeys || allowedSourceKeys.has(sourceKeyById.get(id) ?? ""),
  );
  if (ids.length === 0) {
    return 0;
  }

  const now = nowDhakaIso();
  const placeholders = ids.map(() => "?").join(", ");
  db.prepare(`
    UPDATE jobs
    SET expired_at = ?, expiry_reason = ?
    WHERE id IN (${placeholders})
  `).run(now, "deduped", ...ids);

  return ids.length;
}

export function expireStaleJobs(sourceKeys: Iterable<string>) {
  const keys = Array.from(new Set(sourceKeys));
  if (keys.length === 0) {
    return 0;
  }

  const today = todayDhaka();
  const fallbackThreshold = addDaysToDateOnly(today, -14);
  const sourceFilter = `AND source_key IN (${keys.map(() => "?").join(", ")})`;

  const deadlineExpire = db.prepare(`
    UPDATE jobs
    SET expired_at = ?, expiry_reason = ?
    WHERE expired_at IS NULL
      AND deleted_at IS NULL
      AND CASE
        WHEN admin_deadline_override = 1 THEN admin_deadline_at
        ELSE deadline_at
      END IS NOT NULL
      AND CASE
        WHEN admin_deadline_override = 1 THEN admin_deadline_at
        ELSE deadline_at
      END < ?
      ${sourceFilter}
  `);

  const fallbackExpire = db.prepare(`
    UPDATE jobs
    SET expired_at = ?, expiry_reason = ?
    WHERE expired_at IS NULL
      AND deleted_at IS NULL
      AND CASE
        WHEN admin_deadline_override = 1 THEN admin_deadline_at
        ELSE deadline_at
      END IS NULL
      AND substr(first_listed_at, 1, 10) <= ?
      ${sourceFilter}
  `);

  const now = nowDhakaIso();
  const one = deadlineExpire.run(now, "deadline-passed", today, ...keys);
  const two = fallbackExpire.run(now, "age-limit", fallbackThreshold, ...keys);

  return Number(one.changes) + Number(two.changes);
}

export function archiveJobById(userId: string, jobId: number) {
  return db
    .prepare(`
      INSERT INTO job_user_state (user_id, job_id, archived_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, job_id) DO UPDATE SET
        archived_at = excluded.archived_at
    `)
    .run(userId, jobId, nowDhakaIso());
}

export function unarchiveJobById(userId: string, jobId: number) {
  return db
    .prepare(`
      UPDATE job_user_state
      SET archived_at = NULL
      WHERE user_id = ?
        AND job_id = ?
        AND archived_at IS NOT NULL
    `)
    .run(userId, jobId);
}

export function bookmarkJobById(userId: string, jobId: number) {
  return db
    .prepare(`
      INSERT INTO job_user_state (user_id, job_id, bookmarked_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, job_id) DO UPDATE SET
        bookmarked_at = COALESCE(bookmarked_at, excluded.bookmarked_at)
    `)
    .run(userId, jobId, nowDhakaIso());
}

export function unbookmarkJobById(userId: string, jobId: number) {
  return db
    .prepare(`
      UPDATE job_user_state
      SET bookmarked_at = NULL
      WHERE user_id = ?
        AND job_id = ?
        AND bookmarked_at IS NOT NULL
    `)
    .run(userId, jobId);
}

export function expireUnreliableCvGuyRows() {
  const rows = db
    .prepare<unknown[], Pick<JobRow, "id" | "company" | "source_name" | "expired_at">>(
      `
        SELECT id, company, source_name, expired_at
        FROM jobs
        WHERE expired_at IS NULL
          AND deleted_at IS NULL
          AND source_name = 'The CV Guy'
      `,
    )
    .all()
    .filter((row) => isLikelyInvalidCvGuyCompany(row.company));

  if (rows.length === 0) {
    return 0;
  }

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");

  db.prepare(`
    UPDATE jobs
    SET expired_at = ?, expiry_reason = ?
    WHERE id IN (${placeholders})
  `).run(nowDhakaIso(), "cv-guy-ambiguous", ...ids);

  return ids.length;
}

export function expireUnreliableBdRecruitLegacyRows() {
  const now = nowDhakaIso();
  const result = db.prepare(`
    UPDATE jobs
    SET expired_at = ?, expiry_reason = ?
    WHERE expired_at IS NULL
      AND deleted_at IS NULL
      AND source_key = 'bdrecruit'
      AND detail_url LIKE 'https://bdrecruit.net/job/%'
  `).run(now, "bdrecruit-legacy-url");

  return Number(result.changes);
}

export function getActiveJobsFromDb(userId: string) {
  return db
    .prepare<
      [string],
      ActiveJob
    >(
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
        FROM jobs
        LEFT JOIN job_user_state AS state
          ON state.job_id = jobs.id
          AND state.user_id = ?
        WHERE jobs.expired_at IS NULL
          AND jobs.deleted_at IS NULL
          AND state.archived_at IS NULL
        ORDER BY jobs.first_listed_at DESC, jobs.id DESC
      `,
    )
    .all(userId);
}

export function getArchivedJobsFromDb(userId: string) {
  return db
    .prepare<
      [string],
      ActiveJob
    >(
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
        FROM job_user_state AS state
        INNER JOIN jobs
          ON jobs.id = state.job_id
        WHERE state.user_id = ?
          AND state.archived_at IS NOT NULL
          AND jobs.expired_at IS NULL
          AND jobs.deleted_at IS NULL
        ORDER BY state.archived_at DESC, jobs.id DESC
      `,
    )
    .all(userId);
}

export function getBookmarkedJobsFromDb(userId: string) {
  return db
    .prepare<
      [string],
      ActiveJob
    >(
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
        FROM job_user_state AS state
        INNER JOIN jobs
          ON jobs.id = state.job_id
        WHERE state.user_id = ?
          AND state.bookmarked_at IS NOT NULL
          AND state.archived_at IS NULL
          AND jobs.expired_at IS NULL
          AND jobs.deleted_at IS NULL
        ORDER BY state.bookmarked_at DESC, jobs.id DESC
      `,
    )
    .all(userId);
}
