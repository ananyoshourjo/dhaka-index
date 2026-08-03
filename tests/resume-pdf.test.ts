import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("resume PDF references emit clickable email and phone links", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );

  assert.match(route, /contactLink\(item\.email, `mailto:\$\{item\.email\}`\)/);
  assert.match(route, /contactLink\(item\.phone, `tel:\$\{item\.phone\}`\)/);
  assert.doesNotMatch(
    route,
    /<span class="link">\$\{escapeHtml\(item\.(?:email|phone)\)\}<\/span>/,
  );
});
