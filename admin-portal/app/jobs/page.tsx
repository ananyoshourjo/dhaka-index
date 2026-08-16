import { BriefcaseBusiness } from "lucide-react";
import { revalidatePath } from "next/cache";

import {
  AddJobForm,
  type AddManualJobState,
} from "@/app/jobs/add-job-form";
import { JobFilterBar } from "@/app/jobs/job-filter-bar";
import { EditableJobCard } from "@/app/jobs/editable-job-card";
import {
  addManualJob,
  deleteAdminJob,
  getAdminJobs,
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

async function addManualJobAction(
  _previousState: AddManualJobState,
  formData: FormData,
): Promise<AddManualJobState> {
  "use server";

  await requireAdmin();

  try {
    await addManualJob({
      company: String(formData.get("company") ?? ""),
      title: String(formData.get("title") ?? ""),
      detailUrl: String(formData.get("detailUrl") ?? ""),
      deadlineAt: String(formData.get("deadlineAt") ?? ""),
    });

    revalidatePath("/");
    revalidatePath("/jobs");

    return {
      error: null,
      successId: crypto.randomUUID(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to add this job.",
      successId: null,
    };
  }
}

async function updateJobAction(formData: FormData) {
  "use server";

  await requireAdmin();

  const jobId = Number(formData.get("jobId"));
  const field = String(formData.get("field")) as EditableJobField;
  const value = String(formData.get("value") ?? "");

  if (!Number.isSafeInteger(jobId) || jobId <= 0 || !editableFields.has(field)) {
    throw new Error("Invalid job update.");
  }

  await updateAdminJobField(jobId, field, value);
  revalidatePath("/jobs");
}

async function deleteJobAction(formData: FormData) {
  "use server";

  await requireAdmin();

  const jobId = Number(formData.get("jobId"));

  if (!Number.isSafeInteger(jobId) || jobId <= 0) {
    throw new Error("Invalid job deletion.");
  }

  await deleteAdminJob(jobId);
  revalidatePath("/");
  revalidatePath("/jobs");
}

type AdminJobsPageProps = {
  searchParams: Promise<JobSearchParams>;
};

export default async function AdminJobsPage({
  searchParams,
}: AdminJobsPageProps) {
  await requireAdmin();

  const filters = parseActiveJobFilters(await searchParams);
  const jobs = await getAdminJobs(filters);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-3 px-3 pb-24 pt-5 sm:gap-4 sm:px-6 sm:py-8">
      <JobFilterBar filters={filters} />
      <div className="flex justify-start">
        <AddJobForm action={addManualJobAction} />
      </div>

      {jobs.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card px-6 py-10 text-center text-card-foreground">
          <BriefcaseBusiness
            className="mx-auto mb-4 size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold">
            {hasActiveJobFilters(filters)
              ? "No jobs match these filters."
              : "No active jobs"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {hasActiveJobFilters(filters)
              ? "Try a different search or job function."
              : "New official feed entries will appear here after the shared database syncs."}
          </p>
        </section>
      ) : (
        jobs.map((job) => (
          <EditableJobCard
            key={job.id}
            deleteAction={deleteJobAction}
            job={job}
            updateAction={updateJobAction}
          />
        ))
      )}
    </main>
  );
}
