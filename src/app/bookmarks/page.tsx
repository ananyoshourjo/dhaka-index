export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";

import { JobList } from "@/components/job-list";
import { archiveJobById, unbookmarkJobById } from "@/lib/cloud-db";
import { getBookmarkedJobs } from "@/lib/jobs";
import { requireUser } from "@/lib/session";

async function archiveJobAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const rawJobId = formData.get("jobId");
  const jobId = Number(rawJobId);

  if (Number.isFinite(jobId)) {
    await archiveJobById(user.id, jobId);
    revalidatePath("/");
    revalidatePath("/bookmarks");
    revalidatePath("/archive");
  }
}

async function unbookmarkJobAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const rawJobId = formData.get("jobId");
  const jobId = Number(rawJobId);

  if (Number.isFinite(jobId)) {
    await unbookmarkJobById(user.id, jobId);
    revalidatePath("/");
    revalidatePath("/bookmarks");
  }
}

export default async function BookmarksPage() {
  const user = await requireUser();
  const jobs = await getBookmarkedJobs(user.id);

  return (
    <JobList
      action={archiveJobAction}
      actionLabel="Archive"
      bookmarkAction={unbookmarkJobAction}
      emptyLabel="No bookmarked jobs are listed right now."
      jobs={jobs}
    />
  );
}
