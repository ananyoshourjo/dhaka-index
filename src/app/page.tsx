export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";

import { JobFeedSync } from "@/components/job-feed-sync";
import { JobList } from "@/components/job-list";
import {
  archiveJobById,
  bookmarkJobById,
  unbookmarkJobById,
} from "@/lib/cloud-db";
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

export default async function HomePage() {
  const user = await requireUser();
  const jobs = await getActiveJobs(user.id);

  return (
    <>
      <JobFeedSync />
      <JobList
        action={archiveJobAction}
        actionLabel="Archive"
        bookmarkAction={toggleBookmarkJobAction}
        emptyLabel="No active jobs are listed right now."
        jobs={jobs}
      />
    </>
  );
}
