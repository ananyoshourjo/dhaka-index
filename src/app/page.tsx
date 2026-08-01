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
  hasActiveJobFilters,
  parseActiveJobFilters,
  type JobSearchParams,
} from "@/lib/job-search";
import { getActiveJobs } from "@/lib/jobs";
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
  const page = await getActiveJobs(user.id, filters);

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
        currentPage={page.currentPage}
        filters={filters}
        header={<JobFilterBar filters={filters} />}
        jobs={page.jobs}
        totalPages={page.totalPages}
      />
    </>
  );
}
