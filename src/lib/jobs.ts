import {
  getActiveJobsPageFromDb,
  getArchivedJobsFromDb,
  getBookmarkedJobsFromDb,
  type ActiveJob,
} from "@/lib/cloud-db";
import type { ActiveJobFilters } from "@/lib/job-search";

export function getActiveJobs(userId: string, filters: ActiveJobFilters) {
  return getActiveJobsPageFromDb(userId, filters);
}

export function getArchivedJobs(userId: string): Promise<ActiveJob[]> {
  return getArchivedJobsFromDb(userId);
}

export function getBookmarkedJobs(userId: string): Promise<ActiveJob[]> {
  return getBookmarkedJobsFromDb(userId);
}
