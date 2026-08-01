import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyJobFunctions,
  parseJobFunctions,
  serializeJobFunctions,
} from "../src/lib/job-functions";

test("classifies representative current listings into searchable job functions", () => {
  assert.deepEqual(classifyJobFunctions("Officer / Senior Officer, Accounts"), [
    "Finance & Accounting",
  ]);
  assert.deepEqual(classifyJobFunctions("Associate Product Marketing Manager"), [
    "Marketing & Communications",
    "Product, Project & Strategy",
  ]);
  assert.deepEqual(classifyJobFunctions("Sales Data Analyst"), [
    "Sales & Business Development",
    "Data & Analytics",
  ]);
  assert.deepEqual(classifyJobFunctions("Senior Front-end Developer"), [
    "Software & IT",
  ]);
  assert.deepEqual(classifyJobFunctions("Expression of Interest: Team Leader"), [
    "Other",
  ]);
});

test("serializes multiple job functions for exact database membership checks", () => {
  const serialized = serializeJobFunctions([
    "Sales & Business Development",
    "Data & Analytics",
    "Sales & Business Development",
  ]);

  assert.equal(
    serialized,
    "|Sales & Business Development|Data & Analytics|",
  );
  assert.deepEqual(parseJobFunctions(serialized), [
    "Sales & Business Development",
    "Data & Analytics",
  ]);
  assert.deepEqual(parseJobFunctions("invalid"), ["Other"]);
});
