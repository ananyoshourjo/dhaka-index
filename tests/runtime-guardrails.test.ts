import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("member and admin Workers reuse their Better Auth instance", () => {
  for (const relativePath of [
    "src/lib/auth.ts",
    "admin-portal/app/lib/auth.ts",
  ]) {
    const source = read(relativePath);
    assert.match(source, /let cachedAuth: Auth \| undefined/);
    assert.match(source, /cachedAuth \?\?= createAuth\(\)/);
  }
});

test("hosted requests expose focused timing logs for health checks and failures", () => {
  const worker = read("custom-worker.ts");

  assert.match(worker, /x-dhaka-index-health-check/);
  assert.match(worker, /type: "dhaka-index-request"/);
  assert.match(worker, /status >= 500/);
  assert.doesNotMatch(worker, /request\.headers\.entries/);
});

test("hosted health checker covers every signed-in member route", () => {
  const checker = read("scripts/check-hosted-routes.mjs");

  for (const route of ["/", "/profile", "/bookmarks", "/archive", "/settings"]) {
    assert.match(checker, new RegExp(`"${route.replace("/", "\\/")}"`));
  }

  assert.match(checker, /Worker exceeded resource limits/);
  assert.match(checker, /X-Dhaka-Index-Health-Check/);
  assert.doesNotMatch(checker, /console\.log\([^\n]*(?:password|cookie)/i);
});
