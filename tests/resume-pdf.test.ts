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

test("cover letter names use the same uppercase presentation as resumes", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );
  const builder = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
    "utf8",
  );

  assert.match(
    route,
    /h1 \{[^}]*text-transform: uppercase;/,
  );
  assert.match(
    builder,
    /<h2 className="text-\[17pt\] font-bold uppercase tracking-\[0\.01em\]">\s*\{resume\.contact\.name\}/,
  );
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

test("cover letter contact details include descriptive labels", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );
  const builder = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
    "utf8",
  );

  assert.match(route, /`Phone: \$\{contactLink\(resume\.contact\.phone/);
  assert.match(route, /`Email: \$\{contactLink\(resume\.contact\.email/);
  assert.match(route, /`LinkedIn: \$\{contactLink\(/);
  assert.match(builder, /label: "Phone"/);
  assert.match(builder, /label: "Email"/);
  assert.match(builder, /label: "LinkedIn"/);
  assert.match(builder, /\{item\.label\}: \{" "\}/);
});

test("resume builder uses a download menu when a cover letter is available", () => {
  const builder = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
    "utf8",
  );

  assert.match(builder, /<DropdownMenu>/);
  assert.match(builder, /<DropdownMenuTrigger asChild>/);
  assert.match(builder, /<ChevronDown className="size-4" aria-hidden="true" \/>/);
  assert.match(
    builder,
    /<DropdownMenuItem[\s\S]*onSelect=\{\(\) => downloadPdf\("resume"\)\}[\s\S]*>\s*Resume\s*<\/DropdownMenuItem>/,
  );
  assert.match(
    builder,
    /<DropdownMenuItem[\s\S]*onSelect=\{\(\) => downloadPdf\("coverLetter"\)\}[\s\S]*>\s*Cover Letter\s*<\/DropdownMenuItem>/,
  );
  assert.match(builder, /<span>Download<\/span>/);
  assert.doesNotMatch(builder, /Letter PDF/);
  assert.match(builder, /onClick=\{\(\) => downloadPdf\("resume"\)\}/);
  assert.doesNotMatch(
    builder,
    /const coverLetterPdf = await requestPdf\("coverLetter"\)/,
  );
});
