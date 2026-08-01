import { isJobFunction, type JobFunction } from "@/lib/job-functions";

export const JOBS_PAGE_SIZE = 40;

export type JobSort = "newest" | "closing";
export type CursorDirection = "after" | "before";

export type JobCursor = {
  direction: CursorDirection;
  id: number;
  sort: JobSort;
  value: string;
};

export type ActiveJobFilters = {
  bookmarkedOnly: boolean;
  company: string;
  cursor: JobCursor | null;
  deadlineAvailable: boolean;
  jobFunction: JobFunction | "";
  query: string;
  sort: JobSort;
};

export type JobSearchParams = Record<
  string,
  string | string[] | undefined
>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeText(value: string | undefined, maxLength: number) {
  return (value ?? "").trim().slice(0, maxLength);
}

export function encodeJobCursor(cursor: JobCursor) {
  const sort = cursor.sort === "newest" ? "n" : "c";
  const direction = cursor.direction === "after" ? "a" : "b";

  return [sort, direction, cursor.value, cursor.id].join("~");
}

export function decodeJobCursor(
  value: string | undefined,
  expectedSort: JobSort,
): JobCursor | null {
  if (!value || value.length > 120) {
    return null;
  }

  const parts = value.split("~");
  if (parts.length !== 4) {
    return null;
  }

  const [sortToken, directionToken, cursorValue, rawId] = parts;
  const sort = sortToken === "n" ? "newest" : sortToken === "c" ? "closing" : null;
  const direction =
    directionToken === "a" ? "after" : directionToken === "b" ? "before" : null;
  const id = Number(rawId);

  if (
    sort !== expectedSort ||
    !direction ||
    !cursorValue ||
    cursorValue.length > 64 ||
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  if (sort === "closing" && !/^\d{4}-\d{2}-\d{2}$/.test(cursorValue)) {
    return null;
  }

  return { direction, id, sort, value: cursorValue };
}

export function parseActiveJobFilters(
  searchParams: JobSearchParams,
): ActiveJobFilters {
  const sort: JobSort =
    firstValue(searchParams.sort) === "closing" ? "closing" : "newest";
  const requestedJobFunction = firstValue(searchParams.function);

  return {
    bookmarkedOnly: firstValue(searchParams.bookmarked) === "1",
    company: normalizeText(firstValue(searchParams.company), 240),
    cursor: decodeJobCursor(firstValue(searchParams.cursor), sort),
    deadlineAvailable: firstValue(searchParams.deadline) === "available",
    jobFunction: isJobFunction(requestedJobFunction)
      ? requestedJobFunction
      : "",
    query: normalizeText(firstValue(searchParams.q), 100),
    sort,
  };
}

export function hasActiveJobFilters(filters: ActiveJobFilters) {
  return Boolean(
    filters.query ||
      filters.company ||
      filters.jobFunction ||
      filters.bookmarkedOnly ||
      filters.deadlineAvailable ||
      filters.sort !== "newest",
  );
}

export function createJobsHref(
  filters: ActiveJobFilters,
  cursor: string | null = null,
) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("q", filters.query);
  }
  if (filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }
  if (filters.deadlineAvailable) {
    params.set("deadline", "available");
  }
  if (filters.bookmarkedOnly) {
    params.set("bookmarked", "1");
  }
  if (filters.company) {
    params.set("company", filters.company);
  }
  if (filters.jobFunction) {
    params.set("function", filters.jobFunction);
  }
  if (cursor) {
    params.set("cursor", cursor);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}
