import {
  getActiveJobsFromDb,
  getArchivedJobsFromDb,
  getBookmarkedJobsFromDb,
  initDb,
  type ActiveJob,
} from "@/lib/db";

export function getActiveJobs(userId: string): ActiveJob[] {
  initDb();
  return getActiveJobsFromDb(userId);
}

export function getArchivedJobs(userId: string): ActiveJob[] {
  initDb();
  return getArchivedJobsFromDb(userId);
}

export function getBookmarkedJobs(userId: string): ActiveJob[] {
  initDb();
  return getBookmarkedJobsFromDb(userId);
}
