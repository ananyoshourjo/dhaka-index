PRAGMA foreign_keys = ON;

CREATE TABLE profile_photos_next (
  user_id TEXT PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  image_blob BLOB,
  content_type TEXT,
  legacy_data_url TEXT,
  updated_at TEXT NOT NULL,
  CHECK (image_blob IS NOT NULL OR legacy_data_url IS NOT NULL)
);

INSERT INTO profile_photos_next (
  user_id,
  image_blob,
  content_type,
  updated_at
)
SELECT user_id, image_blob, content_type, updated_at
FROM profile_photos;

DROP TABLE profile_photos;
ALTER TABLE profile_photos_next RENAME TO profile_photos;

INSERT OR IGNORE INTO profile_photos (
  user_id,
  legacy_data_url,
  updated_at
)
SELECT
  "user"."id",
  json_extract(resume_profiles.content_json, '$.contact.photoUrl'),
  resume_profiles.updated_at
FROM resume_profiles
INNER JOIN "user"
  ON "user"."id" = substr(resume_profiles.id, length('profile:') + 1)
WHERE resume_profiles.id LIKE 'profile:%'
  AND json_extract(resume_profiles.content_json, '$.contact.photoUrl') LIKE 'data:image/%';

INSERT OR IGNORE INTO profile_photos (
  user_id,
  legacy_data_url,
  updated_at
)
SELECT "id", "image", "updatedAt"
FROM "user"
WHERE "image" LIKE 'data:image/%';

UPDATE resume_profiles
SET content_json = json_set(content_json, '$.contact.photoUrl', '')
WHERE json_extract(content_json, '$.contact.photoUrl') LIKE 'data:image/%';

UPDATE "user"
SET "image" = NULL
WHERE "image" LIKE 'data:image/%';
