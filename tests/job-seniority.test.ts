import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { classifySeniority, SENIORITY_LEVELS } from "../src/lib/job-seniority";
import { createJobsHref, parseActiveJobFilters } from "../src/lib/job-search";

test("seniority backfill and automatic insert/title-edit triggers agree with classifier", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE jobs (id INTEGER PRIMARY KEY, title TEXT, admin_title TEXT)");
  db.prepare("INSERT INTO jobs(title) VALUES (?)").run("Senior Accountant");
  db.exec(readFileSync(new URL("../migrations/0008_job_seniority.sql", import.meta.url), "utf8"));
  assert.equal(db.prepare("SELECT seniority_level AS level FROM jobs WHERE id=1").get()?.level, "Senior");
  const fixtures = [
    ["Intern, Finance", "Internship"], ["Executive, Marketing", "Entry level"],
    ["Senior Executive", "Senior"], ["Assistant Director", "Mid level"],
    ["Assistant Manager", "Mid level"], ["Head of Design", "Head / Director"],
    ["Team Leader", "Lead / Manager"], ["Software Engineer", "Mid level"],
    ["Junior Designer (Fresher)", "Entry level"], ["Sr. Engineer", "Senior"],
    ["Expression of Interest", "Not specified"], ["Internal Auditor", "Not specified"],
  ];
  for (const [title, level] of fixtures) {
    assert.equal(classifySeniority(title), level, title);
    const result = db.prepare("INSERT INTO jobs(title) VALUES (?)").run(title);
    assert.equal(db.prepare("SELECT seniority_level AS level FROM jobs WHERE id=?").get(result.lastInsertRowid)?.level, level, title);
  }
  db.exec("UPDATE jobs SET admin_title='Design Intern' WHERE id=1");
  db.exec("UPDATE jobs SET title='Head of Design' WHERE id=1");
  assert.equal(db.prepare("SELECT seniority_level AS level FROM jobs WHERE id=1").get()?.level, "Internship");
  db.exec("UPDATE jobs SET admin_title=NULL WHERE id=1");
  assert.equal(db.prepare("SELECT seniority_level AS level FROM jobs WHERE id=1").get()?.level, "Head / Director");
  assert.ok(!SENIORITY_LEVELS.some(level => /c-suite/i.test(level)));
  db.close();
});
test("seniority filter validates and survives pagination", () => {
  const filters = parseActiveJobFilters({seniority:"Senior", q:"design"});
  assert.equal(filters.seniority, "Senior");
  assert.match(createJobsHref(filters, 2), /seniority=Senior/);
  assert.equal(parseActiveJobFilters({seniority:"C-suite"}).seniority, "");
});
