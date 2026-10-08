import assert from "node:assert/strict";
import test from "node:test";
import { splitSeedSql } from "../src/lib/job-seed-batches";

test("large descriptions import in ordered UTF-8 byte-bounded batches", () => {
  const statements = ["অ".repeat(20), "x".repeat(35), "y".repeat(65)];
  const batches = splitSeedSql(statements, 100);
  assert.deepEqual(batches, [
    statements[0] + "\n" + statements[1],
    statements[2],
  ]);
  assert.ok(batches.every((b) => Buffer.byteLength(b, "utf8") <= 100));
});
test("oversized individual statements fail before any import", () => {
  assert.throws(() => splitSeedSql(["a".repeat(101)], 100), /size limit/);
});
