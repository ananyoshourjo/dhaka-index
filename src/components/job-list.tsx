import Link from "next/link";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/job-card";
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
  surface: "archive" | "bookmarks" | "jobs";
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
  surface,
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
          <JobCard
            key={job.id}
            action={action}
            actionLabel={actionLabel}
            bookmarkAction={bookmarkAction}
            formattedDeadline={formatDeadline(job.deadlineAt)}
            job={job}
            surface={surface}
          />
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
