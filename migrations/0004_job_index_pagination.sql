CREATE INDEX IF NOT EXISTS jobs_active_newest_page_idx
ON jobs (expired_at, deleted_at, first_listed_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS jobs_active_deadline_page_idx
ON jobs (
  expired_at,
  deleted_at,
  (CASE
    WHEN admin_deadline_override = 1 THEN admin_deadline_at
    ELSE deadline_at
  END),
  id
);
