import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getWebpDimensions, toPhotoBuffer } from "../src/lib/photo";

test("profile photo migration moves embedded images out of resume and auth rows", () => {
  const migration = fs.readFileSync(
    path.join(
      process.cwd(),
      "migrations",
      "0005_migrate_embedded_profile_photos.sql",
    ),
    "utf8",
  );

  assert.match(migration, /ALTER TABLE profile_photos_next RENAME TO profile_photos/);
  assert.match(migration, /json_extract\(resume_profiles\.content_json/);
  assert.match(migration, /json_set\(content_json, '\$\.contact\.photoUrl', ''\)/);
  assert.match(migration, /UPDATE "user"[\s\S]*SET "image" = NULL/);
});

test("resume saves strip photo references and do not rewrite Better Auth users", () => {
  const resume = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "resume.ts"),
    "utf8",
  );
  const action = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "profile", "actions.ts"),
    "utf8",
  );

  assert.match(resume, /photoUrl: ""/);
  assert.doesNotMatch(resume, /UPDATE "user" SET "image"/);
  assert.doesNotMatch(action, /revalidatePath/);
});

test("WebP validation reads a bounded VP8X thumbnail", () => {
  const bytes = new Uint8Array(30);
  bytes.set(Buffer.from("RIFF"), 0);
  bytes.set(Buffer.from("WEBP"), 8);
  bytes.set(Buffer.from("VP8X"), 12);
  bytes[24] = 143;
  bytes[25] = 1;
  bytes[27] = 99;
  bytes[28] = 1;

  assert.deepEqual(getWebpDimensions(bytes), { width: 400, height: 356 });
  assert.equal(getWebpDimensions(new Uint8Array(30)), null);
});

test("photo responses normalize D1 blob runtime shapes to binary bytes", () => {
  const bytes = [82, 73, 70, 70, 87, 69, 66, 80];
  const readBytes = (value: unknown) =>
    Array.from(new Uint8Array(toPhotoBuffer(value) ?? new ArrayBuffer(0)));

  assert.deepEqual(readBytes(bytes), bytes);
  assert.deepEqual(readBytes(Uint8Array.from(bytes)), bytes);
  assert.deepEqual(readBytes(Uint8Array.from(bytes).buffer), bytes);
  assert.equal(toPhotoBuffer("82,73,70,70"), null);
});

test("resume builder keeps a recoverable draft and reports terminal save failures", () => {
  const builder = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "resume-builder.tsx"),
    "utf8",
  );

  assert.match(builder, /resume-emergency-draft/);
  assert.match(builder, /attempt < 3/);
  assert.match(builder, /"Save failed"/);
  assert.match(builder, /beforeunload/);
  assert.match(builder, /flushLatestResume/);
});
