export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";

import { JobFeedSync } from "@/components/job-feed-sync";
import { JobFilterBar } from "@/components/job-filter-bar";
import { JobList } from "@/components/job-list";
import {
  archiveJobById,
  bookmarkJobById,
  unbookmarkJobById,
} from "@/lib/cloud-db";
import {
  createJobsHref,
  hasActiveJobFilters,
  parseActiveJobFilters,
  type JobSearchParams,
} from "@/lib/job-search";
import { getActiveJobCompanies, getActiveJobs } from "@/lib/jobs";
import { requireUser } from "@/lib/session";

async function archiveJobAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const rawJobId = formData.get("jobId");
  const jobId = Number(rawJobId);

  if (Number.isFinite(jobId)) {
    await archiveJobById(user.id, jobId);
    revalidatePath("/");
    revalidatePath("/archive");
  }
}

async function toggleBookmarkJobAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const rawJobId = formData.get("jobId");
  const rawBookmarkedAt = formData.get("bookmarkedAt");
  const jobId = Number(rawJobId);

  if (Number.isFinite(jobId)) {
    if (rawBookmarkedAt) {
      await unbookmarkJobById(user.id, jobId);
    } else {
      await bookmarkJobById(user.id, jobId);
    }

    revalidatePath("/");
    revalidatePath("/bookmarks");
  }
}

type HomePageProps = {
  searchParams: Promise<JobSearchParams>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await requireUser();
  const filters = parseActiveJobFilters(await searchParams);
  const [page, companies] = await Promise.all([
    getActiveJobs(user.id, filters),
    getActiveJobCompanies(user.id),
  ]);

  return (
    <>
      <JobFeedSync />
      <JobList
        action={archiveJobAction}
        actionLabel="Archive"
        bookmarkAction={toggleBookmarkJobAction}
        emptyLabel={
          hasActiveJobFilters(filters)
            ? "No jobs match these filters."
            : "No active jobs are listed right now."
        }
        header={<JobFilterBar companies={companies} filters={filters} />}
        jobs={page.jobs}
        nextHref={
          page.nextCursor ? createJobsHref(filters, page.nextCursor) : null
        }
        previousHref={
          page.previousCursor
            ? createJobsHref(filters, page.previousCursor)
            : null
        }
        title="Jobs"
      />
    </>
  );
}
