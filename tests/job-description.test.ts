import assert from "node:assert/strict";
import test from "node:test";
import { normalizeJobDescription } from "../src/lib/job-description";

test("normalization creates headings and lists while keeping wrapped content", () => {
  assert.deepEqual(normalizeJobDescription("Responsibilities\n\n• Build tools\nfor customers\n\n• Review work\n\nRequirements:\n\nA degree.\nRelevant experience."), [
    { type: "heading", text: "Responsibilities" },
    { type: "list", ordered: false, items: ["Build tools for customers", "Review work"] },
    { type: "heading", text: "Requirements" },
    { type: "paragraph", text: "A degree. Relevant experience." },
  ]);
});

test("HTML becomes safe structured text with no source links or executable content", () => {
  assert.deepEqual(normalizeJobDescription('<h2>Benefits</h2><ol><li><strong>Health</strong> coverage</li><li>Leave</li></ol><p>See <a href="https://example.com/listing">the listing</a>.</p><script>alert(1)</script>'), [
    { type: "heading", text: "Benefits" },
    { type: "list", ordered: true, items: ["**Health** coverage", "Leave"] },
    { type: "paragraph", text: "See the listing." },
  ]);
});

test("ordinary paragraphs and inline emphasis are not mistaken for bullets", () => {
  assert.deepEqual(normalizeJobDescription("*Flexible* work.\n\nBuild useful things."), [
    { type: "paragraph", text: "*Flexible* work." },
    { type: "paragraph", text: "Build useful things." },
  ]);
});

test("employer section label variants normalize to headings", () => {
  assert.deepEqual(normalizeJobDescription("Job Description / Responsibility\n\nBuild tools.\n\nApply Procedure"), [
    { type: "heading", text: "Job Description / Responsibility" },
    { type: "paragraph", text: "Build tools." },
    { type: "heading", text: "Apply Procedure" },
  ]);
});
