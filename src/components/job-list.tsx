import {
  Archive,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActiveJob } from "@/lib/cloud-db";
import {
  createJobsHref,
  getPaginationItems,
  type ActiveJobFilters,
} from "@/lib/job-search";
import { cn } from "@/lib/utils";

type JobListProps = {
  action: (formData: FormData) => void | Promise<void>;
  actionLabel: string;
  bookmarkAction?: (formData: FormData) => void | Promise<void>;
  emptyLabel: string;
  filters?: ActiveJobFilters;
  header?: ReactNode;
  jobs: ActiveJob[];
  currentPage?: number;
  totalPages?: number;
};

function formatDeadline(deadlineAt: string | null) {
  if (!deadlineAt) {
    return "Deadline not listed";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(`${deadlineAt}T00:00:00+06:00`));
}

export function JobList({
  action,
  actionLabel,
  bookmarkAction,
  currentPage,
  emptyLabel,
  filters,
  header,
  jobs,
  totalPages,
}: JobListProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-3 px-3 pb-24 pt-4 sm:gap-4 sm:px-6 sm:py-8">
      {header}
      {jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </CardContent>
        </Card>
      ) : (
        jobs.map((job) => (
          <Card key={job.id} className="overflow-hidden">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground">{job.company}</p>
                <h2 className="text-xl font-semibold leading-[1.2]">
                  {job.title}
                </h2>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <span>{formatDeadline(job.deadlineAt)}</span>
                </p>
              </div>

              <form className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                <input type="hidden" name="jobId" value={job.id} />
                <input
                  type="hidden"
                  name="bookmarkedAt"
                  value={job.bookmarkedAt ?? ""}
                />
                {bookmarkAction ? (
                  <Button
                    type="submit"
                    formAction={bookmarkAction}
                    variant={job.bookmarkedAt ? "default" : "outline"}
                    className="size-11 p-0 sm:size-10"
                    aria-label={
                      job.bookmarkedAt
                        ? `Remove bookmark for ${job.title}`
                        : `Bookmark ${job.title}`
                    }
                  >
                    <Bookmark
                      className={job.bookmarkedAt ? "size-4 fill-current" : "size-4"}
                      aria-hidden="true"
                    />
                  </Button>
                ) : null}

                <Button
                  type="submit"
                  formAction={action}
                  variant="outline"
                  className="size-11 p-0 sm:size-10"
                  aria-label={`${actionLabel} ${job.title}`}
                >
                  <Archive className="size-4" aria-hidden="true" />
                </Button>

                <Button asChild className="h-11 min-w-0 flex-1 sm:h-9 sm:flex-none">
                  <a
                    href={job.detailUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${job.title}`}
                  >
                    Open
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              </form>
            </CardContent>
          </Card>
        ))
      )}

      {filters && currentPage && totalPages && totalPages > 1 ? (
        <nav aria-label="Job pages" className="flex justify-center gap-1 pt-1">
          {getPaginationItems(currentPage, totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="flex size-9 items-center justify-center text-sm text-muted-foreground"
              >
                …
              </span>
            ) : item === currentPage ? (
              <span
                key={item}
                aria-current="page"
                aria-label={`Page ${item}, current page`}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "size-9 p-0",
                )}
              >
                {item}
              </span>
            ) : (
              <Button
                key={item}
                asChild
                variant="ghost"
                size="sm"
                className="size-9 p-0"
              >
                <Link href={createJobsHref(filters, item)} aria-label={`Page ${item}`}>
                  {item}
                </Link>
              </Button>
            ),
          )}
        </nav>
      ) : null}
    </main>
  );
}
