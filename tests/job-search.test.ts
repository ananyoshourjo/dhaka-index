import assert from "node:assert/strict";
import test from "node:test";

import {
  createJobsHref,
  decodeJobCursor,
  encodeJobCursor,
  parseActiveJobFilters,
} from "../src/lib/job-search";

test("normalizes supported job filters and ignores invalid values", () => {
  const filters = parseActiveJobFilters({
    bookmarked: "1",
    company: " Example Ltd ",
    deadline: "available",
    function: "Marketing & Communications",
    q: " product designer ",
    sort: "closing",
  });

  assert.deepEqual(filters, {
    bookmarkedOnly: true,
    company: "Example Ltd",
    cursor: null,
    deadlineAvailable: true,
    jobFunction: "Marketing & Communications",
    query: "product designer",
    sort: "closing",
  });

  assert.equal(parseActiveJobFilters({ sort: "unsupported" }).sort, "newest");
  assert.equal(
    parseActiveJobFilters({ function: "Unsupported" }).jobFunction,
    "",
  );
});

test("round trips keyset cursors only for their matching sort", () => {
  const cursor = {
    direction: "after" as const,
    id: 42,
    sort: "newest" as const,
    value: "2026-08-01 12:30:00",
  };
  const encoded = encodeJobCursor(cursor);

  assert.deepEqual(decodeJobCursor(encoded, "newest"), cursor);
  assert.equal(decodeJobCursor(encoded, "closing"), null);
  assert.equal(decodeJobCursor("c~a~not-a-date~42", "closing"), null);
});

test("pagination URLs retain filters and replace cursors", () => {
  const filters = parseActiveJobFilters({
    bookmarked: "1",
    company: "Example Ltd",
    deadline: "available",
    function: "Marketing & Communications",
    q: "designer",
    sort: "closing",
  });

  assert.equal(
    createJobsHref(filters, "c~a~2026-08-15~42"),
    "/?q=designer&sort=closing&deadline=available&bookmarked=1&company=Example+Ltd&function=Marketing+%26+Communications&cursor=c%7Ea%7E2026-08-15%7E42",
  );
});
