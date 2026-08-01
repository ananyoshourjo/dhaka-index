import assert from "node:assert/strict";
import test from "node:test";

import {
  createJobsHref,
  getPaginationItems,
  parseActiveJobFilters,
} from "../src/lib/job-search";

test("normalizes supported job filters and ignores invalid values", () => {
  const filters = parseActiveJobFilters({
    function: "Marketing & Communications",
    page: "3",
    q: " product designer ",
  });

  assert.deepEqual(filters, {
    jobFunction: "Marketing & Communications",
    page: 3,
    query: "product designer",
  });

  assert.equal(parseActiveJobFilters({ page: "unsupported" }).page, 1);
  assert.equal(parseActiveJobFilters({ page: "-2" }).page, 1);
  assert.equal(
    parseActiveJobFilters({ function: "Unsupported" }).jobFunction,
    "",
  );
});

test("pagination URLs retain only search and job function", () => {
  const filters = parseActiveJobFilters({
    bookmarked: "1",
    company: "Example Ltd",
    deadline: "available",
    function: "Marketing & Communications",
    q: "designer",
  });

  assert.equal(
    createJobsHref(filters, 4),
    "/?q=designer&function=Marketing+%26+Communications&page=4",
  );
  assert.equal(createJobsHref(filters, 1), "/?q=designer&function=Marketing+%26+Communications");
});

test("builds compact numbered pagination", () => {
  assert.deepEqual(getPaginationItems(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(getPaginationItems(6, 12), [1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
});
