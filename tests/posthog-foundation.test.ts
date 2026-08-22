import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("PostHog uses the privacy-safe manual event contract", async () => {
  const instrumentation = read("src/instrumentation-client.ts");
  const analytics = read("src/lib/product-analytics.ts");
  const adminLayout = read("admin-portal/app/layout.tsx");

  assert.match(instrumentation, /initializeProductAnalytics/);
  assert.match(analytics, /import\("posthog-js\/dist\/module\.slim"\)/);
  assert.match(analytics, /autocapture: false/);
  assert.match(analytics, /capture_pageview: false/);
  assert.match(analytics, /capture_exceptions: false/);
  assert.match(analytics, /capture_performance: false/);
  assert.match(analytics, /disable_session_recording: true/);
  assert.match(analytics, /disable_surveys: true/);
  assert.match(analytics, /before_send/);
  assert.match(analytics, /\$geoip_disable: true/);
  assert.match(analytics, /"\$current_url"/);
  assert.match(analytics, /"search_query"/);
  assert.match(analytics, /posthog\?\.identify\(userId\)/);
  assert.doesNotMatch(analytics, /identify\([^)]*(?:email|name)/i);
  assert.doesNotMatch(adminLayout, /posthog/i);
});

test("analytics helpers bucket searches and restrict route values", async () => {
  const { queryLengthBucket, safeAnalyticsPath, safeErrorName } = await import(
    "../src/lib/product-analytics"
  );

  assert.equal(queryLengthBucket(0), "none");
  assert.equal(queryLengthBucket(3), "1-3");
  assert.equal(queryLengthBucket(10), "4-10");
  assert.equal(queryLengthBucket(25), "11-25");
  assert.equal(queryLengthBucket(100), "26+");
  assert.equal(safeAnalyticsPath("/profile"), "/profile");
  assert.equal(safeAnalyticsPath("/api/private/value"), "other");
  assert.equal(safeErrorName(new TypeError("private message")), "TypeError");
});
