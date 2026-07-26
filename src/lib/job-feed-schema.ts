const MAX_FEED_JOBS = 10_000;

export type FeedDocument = {
  schemaVersion: 1;
  generatedAt: string;
  license: "CC0-1.0";
  jobs: Array<{
    title: string;
    company: string;
    deadline: string | null;
    url: string;
  }>;
};

function validateDateOnly(value: unknown) {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
  ) {
    throw new Error("The job feed contains an invalid deadline.");
  }

  return value;
}

export function validateJobFeed(input: unknown): FeedDocument {
  if (!input || typeof input !== "object") {
    throw new Error("The job feed is not a JSON object.");
  }

  const candidate = input as Partial<FeedDocument>;

  if (
    candidate.schemaVersion !== 1 ||
    candidate.license !== "CC0-1.0" ||
    typeof candidate.generatedAt !== "string" ||
    Number.isNaN(new Date(candidate.generatedAt).getTime()) ||
    !Array.isArray(candidate.jobs)
  ) {
    throw new Error("The job feed metadata is invalid or unsupported.");
  }

  if (candidate.jobs.length > MAX_FEED_JOBS) {
    throw new Error(`The job feed exceeds ${MAX_FEED_JOBS} jobs.`);
  }

  const seenUrls = new Set<string>();
  const jobs = candidate.jobs.map((job) => {
    if (!job || typeof job !== "object") {
      throw new Error("The job feed contains an invalid job.");
    }

    const title = typeof job.title === "string" ? job.title.trim() : "";
    const company = typeof job.company === "string" ? job.company.trim() : "";
    const rawUrl = typeof job.url === "string" ? job.url.trim() : "";

    if (!title || title.length > 240 || !company || company.length > 240) {
      throw new Error("The job feed contains an invalid title or company.");
    }

    const url = new URL(rawUrl);

    if (url.protocol !== "https:") {
      throw new Error("Every canonical job URL must use HTTPS.");
    }

    url.hash = "";
    const canonicalUrl = url.toString();

    if (seenUrls.has(canonicalUrl)) {
      throw new Error(`The job feed repeats ${canonicalUrl}.`);
    }

    seenUrls.add(canonicalUrl);

    return {
      title,
      company,
      deadline: validateDateOnly(job.deadline),
      url: canonicalUrl,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: candidate.generatedAt,
    license: "CC0-1.0",
    jobs,
  };
}
