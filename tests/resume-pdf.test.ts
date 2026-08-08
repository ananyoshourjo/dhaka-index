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

test("cover letter PDF renders the saved rich-text body", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );

  assert.match(route, /const body = normalizeRichTextHtml\(coverLetter\?\.body \?\? ""\);/);
  assert.match(route, /\.body > \* \{ margin: 0; \}/);
  assert.match(route, /\.body ul, \.body ol \{ margin: 0; padding-left: \.3in; \}/);
  assert.doesNotMatch(route, /justifyBody/);
});

test("resume builder exposes a rich-text cover letter editor", () => {
  const builder = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
    "utf8",
  );

  assert.match(builder, /function RichTextEditor\(/);
  assert.match(builder, /role="toolbar"/);
  assert.match(builder, /label: "Bold"/);
  assert.match(builder, /<Popover\s/);
  assert.match(builder, /<PopoverContent/);
  assert.match(builder, /label="Add link"/);
  assert.doesNotMatch(builder, /window\.prompt/);
  assert.match(builder, /label: "Bulleted list"/);
  assert.match(builder, /label: "Numbered list"/);
  assert.match(builder, /label: "Align center"/);
  assert.match(builder, /action=\{/);
  assert.doesNotMatch(builder, /label="Justify body text"/);
  assert.doesNotMatch(
    builder,
    /Select text to format it, add a link, change alignment, or create a list\./,
  );
});

test("resume summary uses the full rich-text editor and PDF renderer", () => {
  const builder = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
    "utf8",
  );
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );

  assert.match(builder, /<EditorSection[\s\S]*title="Summary"/);
  assert.match(builder, /label="Profile paragraph"/);
  assert.match(builder, /<RichTextEditor[\s\S]*label="Profile paragraph"/);
  assert.doesNotMatch(builder, /Write your (?:summary|cover letter) here/);
  assert.match(route, /const summary = renderRichTextHtml\(resume\.summary\.value\);/);
  assert.match(route, /class="summary rich-text-inline"/);
});

test("resume bullets and descriptions use selection-only rich-text formatting", () => {
  const builder = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
    "utf8",
  );
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );

  assert.match(builder, /function RichTextInlineEditor\(/);
  assert.match(builder, /document\.addEventListener\("selectionchange"/);
  assert.match(builder, /label="Bullet point"/);
  assert.match(builder, /label="Description"/);
  assert.match(builder, /label="Clear formatting"/);
  assert.match(builder, /function RichTextPreview\(/);
  assert.match(route, /function renderRichTextHtml\(/);
  assert.match(route, /class=\"rich-text-inline\"/);
  assert.match(route, /renderRichTextHtml\(item\.description\)/);
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

test("resume builder keeps the preview toolbar usable on narrow screens", () => {
  const builder = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
    "utf8",
  );

  assert.match(builder, /flex-nowrap items-center justify-between/);
  assert.match(
    builder,
    /hidden min-w-0 gap-0\.5 text-xs text-muted-foreground sm:grid/,
  );
  assert.match(
    builder,
    /ml-auto flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-2/,
  );
  assert.match(builder, /size-8 shrink-0 p-0 sm:size-9/);
  assert.match(builder, /h-8 shrink-0 gap-1 px-2 sm:h-9 sm:gap-2 sm:px-3/);
});
