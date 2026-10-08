type JobIdentity = { id: number; company: string; title: string };

export function getJobSlug(job: JobIdentity) {
  const name = `${job.company} ${job.title}`
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `${name || "job"}-${job.id}`;
}

export function getJobPath(job: JobIdentity) {
  return `/${getJobSlug(job)}`;
}

export function getJobIdFromSlug(slug: string) {
  const match = /^.+-(\d+)$/.exec(slug);
  const id = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function isJobPath(path: string) {
  return path.startsWith("/jobs/") ||
    (/^\/[^/]+$/.test(path) && getJobIdFromSlug(path.slice(1)) !== null);
}
