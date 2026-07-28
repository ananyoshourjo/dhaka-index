export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import Link from "next/link";

import { JobFeedSync } from "@/components/job-feed-sync";
import { JobList } from "@/components/job-list";
import { Button } from "@/components/ui/button";
import {
  archiveJobById,
  bookmarkJobById,
  hasAnyAdmin,
  isFirstRegisteredUser,
  unbookmarkJobById,
} from "@/lib/db";
import { getActiveJobs } from "@/lib/jobs";
import { requireUser } from "@/lib/session";

async function archiveJobAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const rawJobId = formData.get("jobId");
  const jobId = Number(rawJobId);

  if (Number.isFinite(jobId)) {
    archiveJobById(user.id, jobId);
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
      unbookmarkJobById(user.id, jobId);
    } else {
      bookmarkJobById(user.id, jobId);
    }

    revalidatePath("/");
    revalidatePath("/bookmarks");
  }
}

export default async function HomePage() {
  const user = await requireUser();
  const jobs = getActiveJobs(user.id);
  const shouldClaimAdmin = !hasAnyAdmin() && isFirstRegisteredUser(user.id);

  return (
    <>
      <JobFeedSync />
      <JobList
        action={archiveJobAction}
        actionLabel="Archive"
        bookmarkAction={toggleBookmarkJobAction}
        emptyLabel="No active jobs are listed right now."
        header={
          shouldClaimAdmin ? (
            <section className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Finish administrator setup</p>
                <p className="mt-0.5 text-xs text-amber-800">
                  Claim this installation with the one-time server code.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/setup">Continue setup</Link>
              </Button>
            </section>
          ) : null
        }
        jobs={jobs}
      />
    </>
  );
}
