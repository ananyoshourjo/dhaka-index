import assert from "node:assert/strict";
import test from "node:test";
import { validateJobFeed } from "../src/lib/job-feed-schema";
import { validateApplicationUrl } from "../src/lib/job-content";

test("job content survives feed validation without treating the listing as an application", () => {
  const job = {
    title: "Engineer",
    company: "Example",
    deadline: null,
    url: "https://example.com/job/1",
    description: "Responsibilities\n\nBuild useful tools.",
    applyUrl: "https://example.com/apply/1#form",
    applicationInstructions: null,
    contentCheckedAt: "2026-10-07T16:00:00Z",
  };
  assert.deepEqual(
    validateJobFeed({
      schemaVersion: 1,
      license: "CC0-1.0",
      generatedAt: "2026-10-07T16:00:00Z",
      jobs: [job],
    }).jobs,
    [job],
  );
});

test("application destinations preserve form anchors and reject unsafe schemes", () => {
  assert.equal(
    validateApplicationUrl("mailto:careers@example.com?subject=Engineer"),
    "mailto:careers@example.com?subject=Engineer",
  );
  assert.equal(
    validateApplicationUrl("https://example.com/jobs/1#application"),
    "https://example.com/jobs/1#application",
  );
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "http://example.com",
    "https://u:p@example.com",
    "mailto:",
  ])
    assert.throws(() => validateApplicationUrl(url));
});
