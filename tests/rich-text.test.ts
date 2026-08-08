import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeRichTextHtml,
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "@/lib/rich-text";

test("legacy plain cover-letter text is converted into paragraphs", () => {
  assert.equal(
    normalizeRichTextHtml("First paragraph\n\nSecond paragraph"),
    "<p>First paragraph</p><p>Second paragraph</p>",
  );
});

test("rich-text sanitization keeps formatting and safe links", () => {
  const sanitized = sanitizeRichTextHtml(
    '<p style="text-align: center; color: red"><strong>Safe</strong><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a></p>',
  );

  assert.match(sanitized, /<strong>Safe<\/strong>/);
  assert.match(
    sanitized,
    /style="text-align: center;"[^>]*>.*<a href="https:\/\/example\.com" target="_blank" rel="noreferrer">good<\/a>/,
  );
  assert.doesNotMatch(sanitized, /script|javascript|alert/i);
  assert.equal((sanitized.match(/<\/a>/g) ?? []).length, 1);
  assert.doesNotMatch(sanitized, /color/);
});

test("rich-text plain text extraction handles lists", () => {
  assert.equal(
    richTextToPlainText("<ol><li>One</li><li>Two</li></ol>"),
    "One\nTwo",
  );
});
