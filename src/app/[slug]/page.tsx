import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { JobDetailView } from "@/components/job-detail";
import { getJobByIdFromDb } from "@/lib/cloud-db";
import { getJobIdFromSlug, getJobPath, getJobSlug } from "@/lib/job-url";

export const dynamic = "force-dynamic";
const getJob = cache((slug: string) => {
  const id = getJobIdFromSlug(slug);
  return id === null ? Promise.resolve(null) : getJobByIdFromDb(id);
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const job = await getJob((await params).slug);
  if (!job) return { title: "Job unavailable | Dhaka Index" };
  return {
    title: `${job.title} at ${job.company} | Dhaka Index`,
    description: job.description?.slice(0, 160),
    alternates: { canonical: getJobPath(job) },
    openGraph: { title: job.title, description: job.company, url: getJobPath(job) },
  };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();
  if (slug !== getJobSlug(job)) permanentRedirect(getJobPath(job));
  return <JobDetailView job={job} />;
}
