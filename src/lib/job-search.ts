import { isJobFunction, type JobFunction } from "@/lib/job-functions";

export const JOBS_PAGE_SIZE = 40;

export type ActiveJobFilters = {
  jobFunction: JobFunction | "";
  page: number;
  query: string;
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

export function parseActiveJobFilters(
  searchParams: JobSearchParams,
): ActiveJobFilters {
  const requestedJobFunction = firstValue(searchParams.function);
  const requestedPage = Number(firstValue(searchParams.page));

  return {
    jobFunction: isJobFunction(requestedJobFunction)
      ? requestedJobFunction
      : "",
    page:
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? Math.min(requestedPage, 10_000)
        : 1,
    query: normalizeText(firstValue(searchParams.q), 100),
  };
}

export function hasActiveJobFilters(filters: ActiveJobFilters) {
  return Boolean(filters.query || filters.jobFunction);
}

export function createJobsHref(filters: ActiveJobFilters, page = 1) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("q", filters.query);
  }
  if (filters.jobFunction) {
    params.set("function", filters.jobFunction);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export type PaginationItem = number | "ellipsis";

export function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const orderedPages = [...pages].sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  orderedPages.forEach((page, index) => {
    const previousPage = orderedPages[index - 1];
    if (previousPage && page - previousPage > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}
