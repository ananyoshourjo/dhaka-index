import assert from "node:assert/strict";
import test from "node:test";
import { getJobPath, getJobIdFromSlug, isJobPath } from "../src/lib/job-url";

test("job URLs include company, role and unique record ID", () => {
  const job = { company: "City Bank", title: "Trainee Assistant Manager, Branch Banking", id: 4067 };
  assert.equal(getJobPath(job), "/city-bank-trainee-assistant-manager-branch-banking-4067");
  assert.notEqual(getJobPath(job), getJobPath({ ...job, id: 4068 }));
  assert.equal(getJobIdFromSlug(getJobPath(job).slice(1)), 4067);
  assert.equal(getJobPath({ company: "বাংলা", title: "কাজ", id: 1 }), "/বাংলা-কাজ-1");
});

test("slug IDs reject malformed and unsafe identities without matching other routes", () => {
  for (const slug of ["123", "job-0", "job-1x", "job-9007199254740992"]) {
    assert.equal(getJobIdFromSlug(slug), null);
  }
  assert.equal(isJobPath("/settings"), false);
  assert.equal(isJobPath("/api/jobs/1"), false);
  assert.equal(isJobPath("/jobs/4067"), true);
  assert.equal(isJobPath("/city-bank-role-4067"), true);
});
