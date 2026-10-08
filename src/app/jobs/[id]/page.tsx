import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JobDetailView } from "@/components/job-detail";
import { getJobByIdFromDb } from "@/lib/cloud-db";

export const dynamic = "force-dynamic";
const getJob = cache((id: string) =>
  /^\d+$/.test(id) ? getJobByIdFromDb(Number(id)) : Promise.resolve(null),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return { title: "Job unavailable | Dhaka Index" };
  return {
    title: `${job.title} at ${job.company} | Dhaka Index`,
    description: job.description?.slice(0, 160),
    alternates: { canonical: `/jobs/${job.id}` },
    openGraph: {
      title: job.title,
      description: job.company,
      url: `/jobs/${job.id}`,
    },
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const job = await getJob((await params).id);
  if (!job) notFound();
  return <JobDetailView job={job} />;
}
