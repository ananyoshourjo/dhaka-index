import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("keeps admin ownership, user data, and feed overrides local", async () => {
  const temporaryData = fs.mkdtempSync(
    path.join(os.tmpdir(), "dhaka-index-test-"),
  );
  process.env.DHAKA_INDEX_DATA_DIR = temporaryData;
  const originalWarn = console.warn;
  console.warn = () => {};

  const database = await import("../src/lib/db");

  try {
    database.initDb();
    database.ensureAdminSetupAvailable();
    const userId = "first-user";
    const timestamp = "2026-07-26T12:00:00.000Z";

    database.db
      .prepare(`
        INSERT INTO "user" (
          id, name, email, "emailVerified", image, "createdAt", "updatedAt"
        )
        VALUES (?, ?, ?, 1, NULL, ?, ?)
      `)
      .run(userId, "Local User", "local@example.com", timestamp, timestamp);

    const setupCode = fs
      .readFileSync(path.join(temporaryData, "initial-admin-code.txt"), "utf8")
      .trim();
    database.claimInitialAdmin(userId, setupCode);

    assert.equal(database.isAdmin(userId), true);
    assert.equal(
      fs.existsSync(path.join(temporaryData, "initial-admin-code.txt")),
      false,
    );

    database.upsertOfficialFeedJob({
      title: "Base title",
      company: "Base company",
      deadlineAt: "2026-08-20",
      canonicalUrl: "https://example.com/jobs/base",
    });
    database.db
      .prepare(`
        UPDATE jobs
        SET admin_title = 'Local corrected title'
        WHERE canonical_url = 'https://example.com/jobs/base'
      `)
      .run();
    database.upsertOfficialFeedJob({
      title: "Updated feed title",
      company: "Updated feed company",
      deadlineAt: "2026-08-21",
      canonicalUrl: "https://example.com/jobs/base",
    });

    const jobs = database.getActiveJobsFromDb(userId);
    assert.equal(jobs[0]?.title, "Local corrected title");
    assert.equal(jobs[0]?.company, "Updated feed company");

    const resume = await import("../src/lib/resume");
    const legacyResume = {
      ...resume.defaultResumeContent,
      layout: { multiPage: false },
    };
    database.db
      .prepare(`
        INSERT INTO resume_profiles (id, content_json, updated_at)
        VALUES (?, ?, ?)
      `)
      .run(`profile:${userId}`, JSON.stringify(legacyResume), timestamp);

    const normalizedResume = resume.getResumeContent(userId);
    assert.equal("layout" in normalizedResume, false);

    const legacyRuntimeResume = {
      ...normalizedResume,
      layout: { multiPage: false },
    };
    resume.saveResumeContent(userId, legacyRuntimeResume);
    const savedResume = database.db
      .prepare<[string], { content_json: string }>(
        `SELECT content_json FROM resume_profiles WHERE id = ?`,
      )
      .get(`profile:${userId}`);
    assert.equal(
      "layout" in JSON.parse(savedResume?.content_json ?? "{}"),
      false,
    );

    const exported = JSON.stringify(database.getUserDataExport(userId));
    assert.match(exported, /local@example\.com/);
    assert.doesNotMatch(exported, /password|session|accessToken|refreshToken/);
  } finally {
    console.warn = originalWarn;
    database.db.close();
    fs.rmSync(temporaryData, { force: true, recursive: true });
  }
});
