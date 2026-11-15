// Only identities already visible on public job-detail pages belong here.
export const PUBLIC_JOB_IDENTITIES_SQL = `
  SELECT id, COALESCE(admin_title, title) AS title,
    COALESCE(admin_company, company) AS company
  FROM jobs
  WHERE expired_at IS NULL AND deleted_at IS NULL
    AND (
      (CASE WHEN admin_deadline_override = 1 THEN admin_deadline_at ELSE deadline_at END) IS NULL
      OR (CASE WHEN admin_deadline_override = 1 THEN admin_deadline_at ELSE deadline_at END) >= ?
    )
  ORDER BY id DESC
`;

export type PublicJobIdentity = { id: number; title: string; company: string };
