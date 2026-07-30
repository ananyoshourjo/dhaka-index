import {
  getActiveJobsFromDb,
  getArchivedJobsFromDb,
  getBookmarkedJobsFromDb,
  type ActiveJob,
} from "@/lib/cloud-db";

export function getActiveJobs(userId: string): Promise<ActiveJob[]> {
  return getActiveJobsFromDb(userId);
}

export function getArchivedJobs(userId: string): Promise<ActiveJob[]> {
  return getArchivedJobsFromDb(userId);
}

export function getBookmarkedJobs(userId: string): Promise<ActiveJob[]> {
  return getBookmarkedJobsFromDb(userId);
}
