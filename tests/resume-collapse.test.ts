import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { normalizeResumeCollapsedSectionIds } from "../src/lib/resume-schema";

const builder = readFileSync(
  path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
  "utf8",
);

test("profile editor sections and entries pair drag grips with collapse controls", () => {
  const dragGrips = builder.match(/<GripVertical\b/g) ?? [];
  const collapseControls = builder.match(/<CollapseButton\b/g) ?? [];
  const bulletEditor = builder.slice(
    builder.indexOf("function BulletEditor"),
    builder.indexOf("function GridRowEditor"),
  );

  assert.ok(dragGrips.length > 0);
  assert.equal(collapseControls.length, dragGrips.length - 1);
  assert.match(bulletEditor, /<GripVertical\b/);
  assert.doesNotMatch(bulletEditor, /<CollapseButton\b/);
  assert.match(builder, /aria-expanded=\{!collapsed\}/);
  assert.match(builder, /collapsed && "-rotate-90"/);
});

test("sections, entries, and grid rows support compact states", () => {
  assert.match(builder, /hidden=\{collapsed\}/);
  assert.match(builder, /collapsedSectionIds: \[\.\.\.next\]/);
  assert.match(builder, /isCollapsed\(entryCollapseId\("work", item\.id\)\)/);
  assert.match(builder, /isCollapsed\(entryCollapseId\("activity", item\.id\)\)/);
  assert.match(builder, /isCollapsed\(entryCollapseId\("custom", item\.id\)\)/);
});

test("collapse state normalizes safely for older saved profiles", () => {
  assert.deepEqual(
    normalizeResumeCollapsedSectionIds([
      "section:education",
      "section:education",
      "",
      "  ",
      null,
      42,
      "entry:work:work-1",
    ]),
    ["section:education", "entry:work:work-1"],
  );
  assert.deepEqual(normalizeResumeCollapsedSectionIds(undefined), []);
});

test("multiline editor fields can shrink on narrow screens", () => {
  assert.match(
    builder,
    /<textarea[\s\S]*?className="w-full min-w-0 resize-y/,
  );
});
