import { Archive, ArrowUpRight, Bookmark, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActiveJob } from "@/lib/db";

type JobListProps = {
  action: (formData: FormData) => void | Promise<void>;
  actionLabel: string;
  bookmarkAction?: (formData: FormData) => void | Promise<void>;
  emptyLabel: string;
  header?: ReactNode;
  jobs: ActiveJob[];
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
}: JobListProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      {header}
      {jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </CardContent>
        </Card>
      ) : (
        jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground">{job.company}</p>
                <h1 className="text-base font-semibold leading-snug sm:text-lg">
                  {job.title}
                </h1>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <span>{formatDeadline(job.deadlineAt)}</span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {bookmarkAction ? (
                  <form action={bookmarkAction}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input
                      type="hidden"
                      name="bookmarkedAt"
                      value={job.bookmarkedAt ?? ""}
                    />
                    <Button
                      type="submit"
                      variant={job.bookmarkedAt ? "default" : "outline"}
                      className="size-10 p-0"
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
                  </form>
                ) : null}

                <form action={action}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="size-10 p-0"
                    aria-label={`${actionLabel} ${job.title}`}
                  >
                    <Archive className="size-4" aria-hidden="true" />
                  </Button>
                </form>

                <Button asChild>
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
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </main>
  );
}
