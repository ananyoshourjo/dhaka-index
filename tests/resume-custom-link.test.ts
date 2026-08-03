import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { normalizeResumeCustomSections } from "../src/lib/resume-schema";
import { normalizeResumeLink } from "../src/lib/resume-links";

test("custom entry links are preserved and legacy entries get an empty link", () => {
  const sections = normalizeResumeCustomSections([
    {
      id: "custom:links",
      title: "Projects & Startups",
      entries: [
        {
          id: "legacy-entry",
          heading: "Kormo",
          subheading: "",
          place: "",
          dates: "",
          useBullets: false,
          description: "A description",
          bullets: [],
        },
        {
          id: "linked-entry",
          heading: "Dhaka Index",
          subheading: "A project",
          link: "dhakaindex.com",
          place: "",
          dates: "",
          useBullets: false,
          description: "A description",
          bullets: [],
        },
      ],
    },
  ]);

  assert.equal(sections[0]?.entries[0]?.link, "");
  assert.equal(sections[0]?.entries[1]?.link, "dhakaindex.com");
});

test("resume links normalize to safe HTTP(S) URLs", () => {
  assert.equal(normalizeResumeLink("kormo.org"), "https://kormo.org/");
  assert.equal(
    normalizeResumeLink("https://dhakaindex.com/projects"),
    "https://dhakaindex.com/projects",
  );
  assert.equal(normalizeResumeLink("javascript:alert(1)"), "");
  assert.equal(normalizeResumeLink(""), "");
});

test("custom links are wired into the PDF anchor path", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "api", "resume", "pdf", "route.ts"),
    "utf8",
  );

  assert.match(route, /const link = item\.link\.trim\(\)/);
  assert.match(route, /externalLink\(link, link\)/);
  assert.match(route, /normalizeResumeLink\(href\)/);
});
