import { Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";

import { EditableJobCard } from "@/app/jobs/editable-job-card";
import { JobFilterBar } from "@/app/jobs/job-filter-bar";
import {
  getDeletedAdminJobs,
  recoverAdminJob,
  updateAdminJobField,
  type EditableJobField,
} from "@/app/lib/jobs";
import { requireAdmin } from "@/app/lib/session";
import {
  hasActiveJobFilters,
  parseActiveJobFilters,
  type JobSearchParams,
} from "../../../src/lib/job-search";

export const dynamic = "force-dynamic";

const editableFields = new Set<EditableJobField>([
  "company",
  "title",
  "deadline",
]);

async function updateTrashJobAction(formData: FormData) {
  "use server";

  await requireAdmin();

  const jobId = Number(formData.get("jobId"));
  const field = String(formData.get("field")) as EditableJobField;
  const value = String(formData.get("value") ?? "");

  if (!Number.isSafeInteger(jobId) || jobId <= 0 || !editableFields.has(field)) {
    throw new Error("Invalid job update.");
  }

  await updateAdminJobField(jobId, field, value, true);
  revalidatePath("/trash");
}

async function recoverJobAction(formData: FormData) {
  "use server";

  await requireAdmin();

  const jobId = Number(formData.get("jobId"));

  if (!Number.isSafeInteger(jobId) || jobId <= 0) {
    throw new Error("Invalid job recovery.");
  }

  const result = await recoverAdminJob(jobId);

  if (result.meta.changes !== 1) {
    throw new Error("Deleted job not found.");
  }

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/trash");
  revalidatePath("/bookmarks");
  revalidatePath("/archive");
}

type TrashPageProps = {
  searchParams: Promise<JobSearchParams>;
};

export default async function TrashPage({ searchParams }: TrashPageProps) {
  await requireAdmin();

  const filters = parseActiveJobFilters(await searchParams);
  const jobs = await getDeletedAdminJobs(filters);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-3 px-3 pb-24 pt-5 sm:gap-4 sm:px-6 sm:py-8">
      <JobFilterBar actionPath="/trash" filters={filters} />

      {jobs.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card px-6 py-10 text-center text-card-foreground">
          <Trash2
            className="mx-auto mb-4 size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold">
            {hasActiveJobFilters(filters)
              ? "No deleted jobs match these filters."
              : "Trash is empty"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {hasActiveJobFilters(filters)
              ? "Try a different search or job function."
              : "Jobs deleted from the active listings will appear here."}
          </p>
        </section>
      ) : (
        jobs.map((job) => (
          <EditableJobCard
            key={job.id}
            job={job}
            recoverAction={recoverJobAction}
            updateAction={updateTrashJobAction}
          />
        ))
      )}
    </main>
  );
}
