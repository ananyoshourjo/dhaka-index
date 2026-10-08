import { notFound, permanentRedirect } from "next/navigation";
import { getJobByIdFromDb } from "@/lib/cloud-db";
import { getJobPath } from "@/lib/job-url";

export const dynamic = "force-dynamic";

export default async function LegacyJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const number = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(number) || number <= 0) notFound();
  const job = await getJobByIdFromDb(number);
  if (!job) notFound();
  permanentRedirect(getJobPath(job));
}
