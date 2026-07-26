export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";

import { JobList } from "@/components/job-list";
import { unarchiveJobById } from "@/lib/db";
import { getArchivedJobs } from "@/lib/jobs";
import { requireUser } from "@/lib/session";

async function unarchiveJobAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const rawJobId = formData.get("jobId");
  const jobId = Number(rawJobId);

  if (Number.isFinite(jobId)) {
    unarchiveJobById(user.id, jobId);
    revalidatePath("/");
    revalidatePath("/archive");
  }
}

export default async function ArchivePage() {
  const user = await requireUser();
  const jobs = getArchivedJobs(user.id);

  return (
    <JobList
      action={unarchiveJobAction}
      actionLabel="Unarchive"
      emptyLabel="No archived jobs are listed right now."
      jobs={jobs}
    />
  );
}
