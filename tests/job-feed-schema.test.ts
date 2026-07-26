import assert from "node:assert/strict";
import test from "node:test";

import { validateJobFeed } from "../src/lib/job-feed-schema";

test("accepts and normalizes the public four-field feed", () => {
  const feed = validateJobFeed({
    schemaVersion: 1,
    generatedAt: "2026-07-26T12:00:00.000Z",
    license: "CC0-1.0",
    jobs: [
      {
        title: " Product Designer ",
        company: " Example Ltd ",
        deadline: "2026-08-15",
        url: "https://example.com/jobs/1#apply",
      },
    ],
  });

  assert.deepEqual(feed.jobs, [
    {
      title: "Product Designer",
      company: "Example Ltd",
      deadline: "2026-08-15",
      url: "https://example.com/jobs/1",
    },
  ]);
});

test("rejects unsafe URLs and duplicate canonical links", () => {
  assert.throws(() =>
    validateJobFeed({
      schemaVersion: 1,
      generatedAt: "2026-07-26T12:00:00.000Z",
      license: "CC0-1.0",
      jobs: [
        {
          title: "Role",
          company: "Company",
          deadline: null,
          url: "http://example.com/jobs/1",
        },
      ],
    }),
  );

  assert.throws(() =>
    validateJobFeed({
      schemaVersion: 1,
      generatedAt: "2026-07-26T12:00:00.000Z",
      license: "CC0-1.0",
      jobs: [
        {
          title: "Role one",
          company: "Company",
          deadline: null,
          url: "https://example.com/jobs/1",
        },
        {
          title: "Role two",
          company: "Company",
          deadline: null,
          url: "https://example.com/jobs/1#apply",
        },
      ],
    }),
  );
});
