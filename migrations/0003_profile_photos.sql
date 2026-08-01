PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profile_photos (
  user_id TEXT PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  image_blob BLOB NOT NULL,
  content_type TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
