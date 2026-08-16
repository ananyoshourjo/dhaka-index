import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { normalizeManualJobInput } from "../src/lib/manual-job";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("manual job input normalizes the public URL and optional deadline", () => {
  assert.deepEqual(
    normalizeManualJobInput({
      title: "  Product Designer ",
      company: "  Example Ltd. ",
      detailUrl: "https://example.com/jobs/product-designer#apply",
      deadlineAt: "2026-09-05",
    }),
    {
      title: "Product Designer",
      company: "Example Ltd.",
      detailUrl: "https://example.com/jobs/product-designer",
      deadlineAt: "2026-09-05",
    },
  );
});

test("manual job input rejects unsafe URLs and invalid deadlines", () => {
  assert.throws(
    () =>
      normalizeManualJobInput({
        title: "Developer",
        company: "Example Ltd.",
        detailUrl: "http://example.com/jobs/1",
      }),
    /must use HTTPS/,
  );

  assert.throws(
    () =>
      normalizeManualJobInput({
        title: "Developer",
        company: "Example Ltd.",
        detailUrl: "https://example.com/jobs/1",
        deadlineAt: "2026-02-30",
      }),
    /YYYY-MM-DD/,
  );
});

test("manual jobs are separate from official feed ownership", () => {
  const adminJobs = read("admin-portal/app/lib/jobs.ts");
  const cloudDb = read("src/lib/cloud-db.ts");

  assert.match(adminJobs, /'admin-manual', 'Dhaka Index Admin', 'manual'/);
  assert.match(
    cloudDb,
    /WHERE jobs\.source_key = 'dhaka-index-feed'/,
  );
});

test("manual job entry uses a clean modal and the shadcn calendar", () => {
  const jobsPage = read("admin-portal/app/jobs/page.tsx");
  const form = read("admin-portal/app/jobs/add-job-form.tsx");

  assert.match(
    jobsPage,
    /<JobFilterBar filters=\{filters\} \/>[\s\S]*<AddJobForm action=\{addManualJobAction\} \/>/,
  );
  assert.match(jobsPage, /className="flex justify-start"/);
  assert.match(form, /<DialogTrigger asChild>/);
  assert.match(form, /<DialogTitle>Add a new job<\/DialogTitle>/);
  assert.match(form, /from "@\/components\/ui\/calendar"/);
  assert.match(form, /<Calendar/);
  assert.match(form, /name="deadlineAt"/);
  assert.doesNotMatch(form, /placeholder=/i);
  assert.doesNotMatch(form, /\bPlus\b/);
  assert.doesNotMatch(form, /Submit an HTTPS|go live on the main site immediately/i);
});
