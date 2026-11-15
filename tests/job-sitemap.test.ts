import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { PUBLIC_JOB_IDENTITIES_SQL } from "../src/lib/job-sitemap";

test("public sitemap excludes expired/deleted jobs and respects effective deadlines", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`CREATE TABLE jobs (
      id INTEGER PRIMARY KEY, title TEXT, company TEXT,
      admin_title TEXT, admin_company TEXT, deadline_at TEXT,
      admin_deadline_override INTEGER DEFAULT 0, admin_deadline_at TEXT,
      expired_at TEXT, deleted_at TEXT
    );
    INSERT INTO jobs (id, title, company, deadline_at, expired_at, deleted_at) VALUES
      (1, 'Open role', 'Company', NULL, NULL, NULL),
      (2, 'Today', 'Company', '2026-11-15', NULL, NULL),
      (3, 'Past deadline', 'Company', '2026-11-14', NULL, NULL),
      (4, 'Expired', 'Company', '2026-12-01', '2026-11-14', NULL),
      (5, 'Deleted', 'Company', NULL, NULL, '2026-11-14'),
      (6, 'Extended', 'Company', '2026-11-14', NULL, NULL),
      (7, 'Shortened', 'Company', '2026-12-01', NULL, NULL),
      (8, 'Deadline removed', 'Company', '2026-11-14', NULL, NULL);
    UPDATE jobs SET admin_deadline_override = 1, admin_deadline_at = '2026-11-16',
      admin_title = 'Corrected role', admin_company = 'Corrected company' WHERE id = 6;
    UPDATE jobs SET admin_deadline_override = 1, admin_deadline_at = '2026-11-14' WHERE id = 7;
    UPDATE jobs SET admin_deadline_override = 1 WHERE id = 8;`);

    const rows = db.prepare(PUBLIC_JOB_IDENTITIES_SQL).all("2026-11-15");
    assert.deepEqual(rows.map((row) => row.id), [8, 6, 2, 1]);
    assert.deepEqual({ ...rows[1] }, {
      id: 6, title: "Corrected role", company: "Corrected company",
    });
    assert.deepEqual(Object.keys(rows[0]).sort(), ["company", "id", "title"]);
  } finally {
    db.close();
  }
});
