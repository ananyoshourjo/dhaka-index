import type { MetadataRoute } from "next";
import { getPublicJobIdentities } from "@/lib/cloud-db";
import { getJobPath } from "@/lib/job-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await getPublicJobIdentities();
  return jobs.map((job) => ({
    url: new URL(getJobPath(job), "https://dhakaindex.com").href,
  }));
}
