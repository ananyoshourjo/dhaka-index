import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ActiveJob } from "@/lib/cloud-db";

type JobListProps = {
  action: (formData: FormData) => void | Promise<void>;
  actionLabel: string;
  bookmarkAction?: (formData: FormData) => void | Promise<void>;
  emptyLabel: string;
  header?: ReactNode;
  jobs: ActiveJob[];
  nextHref?: string | null;
  previousHref?: string | null;
  title: string;
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
  emptyLabel,
  header,
  jobs,
  nextHref,
  previousHref,
  title,
}: JobListProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-3 px-3 pb-24 pt-4 sm:gap-4 sm:px-6 sm:py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {jobs.length === 1
            ? "Showing 1 job"
            : `Showing ${jobs.length} jobs`}
        </p>
      </div>
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
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {job.jobFunctions.map((jobFunction) => (
                    <Badge key={jobFunction} variant="secondary">
                      {jobFunction}
                    </Badge>
                  ))}
                </div>
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

      {previousHref || nextHref ? (
        <nav
          aria-label={`${title} pagination`}
          className="flex items-center justify-between gap-3 pt-1"
        >
          {previousHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={previousHref}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}

          {nextHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={nextHref}>
                Next
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
