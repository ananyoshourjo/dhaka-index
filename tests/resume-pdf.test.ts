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

test("cover letter body alignment follows the saved preference", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );

  assert.match(
    route,
    /const bodyTextAlign = coverLetter\?\.justifyBody === true \? "justify" : "left";/,
  );
  assert.match(route, /text-align: \$\{bodyTextAlign\};/);
});

test("cover letter PDF references emit clickable contact links", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );

  assert.match(
    route,
    /contactLink\(resume\.contact\.phone, `tel:\$\{resume\.contact\.phone\}`\)/,
  );
  assert.match(
    route,
    /contactLink\(resume\.contact\.email, `mailto:\$\{resume\.contact\.email\}`\)/,
  );
  assert.match(
    route,
    /contactLink\(\s*resume\.contact\.linkedin,\s*linkedinHref\(resume\.contact\.linkedin\),\s*\)/,
  );
  assert.match(
    route,
    /\.link \{ color: #1447e6; text-decoration: underline; \}/,
  );
});
