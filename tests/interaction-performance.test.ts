import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function readWorkspaceFile(...segments: string[]) {
  return fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");
}

test("pending bookmarks keep their selected or unselected appearance", () => {
  const jobCard = readWorkspaceFile("src", "components", "job-card.tsx");

  assert.match(jobCard, /disabled:opacity-100/);
  assert.match(jobCard, /transition-none/);
  assert.match(jobCard, /disabled=\{pending\}/);
});

test("optimistic job actions dispatch persistence before changing the card", () => {
  const jobCard = readWorkspaceFile("src", "components", "job-card.tsx");

  assert.match(
    jobCard,
    /const request = action\(new FormData\(form\)\);\s*removeOptimistically\(true\)/,
  );
  assert.match(
    jobCard,
    /const request = bookmarkAction\(new FormData\(form\)\);\s*setPending\(true\);\s*setOptimisticBookmarkedAt/,
  );
  assert.doesNotMatch(jobCard, /formAction=/);
});

test("authenticated navigation avoids repeated session database reads", () => {
  const auth = readWorkspaceFile("src", "lib", "auth.ts");

  assert.match(auth, /cookieCache:\s*\{/);
  assert.match(auth, /enabled:\s*true/);
  assert.match(auth, /maxAge:\s*60/);
  assert.match(auth, /strategy:\s*"compact"/);
});

test("lightweight primary job routes are fully prefetched", () => {
  const navigation = readWorkspaceFile("src", "components", "top-tabs.tsx");

  assert.match(navigation, /href:\s*"\/"[^\n]+prefetch:\s*true/);
  assert.match(navigation, /href:\s*"\/bookmarks"[^\n]+prefetch:\s*true/);
  assert.match(navigation, /href:\s*"\/profile"[^\n]+prefetch:\s*null/);
  assert.match(navigation, /prefetch=\{tab\.prefetch\}/);
});
