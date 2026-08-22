"use client";

import {
  Archive,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActiveJob } from "@/lib/cloud-db";
import { captureProductEvent } from "@/lib/product-analytics";

type JobAction = (formData: FormData) => void | Promise<void>;

type JobCardProps = {
  action: JobAction;
  actionLabel: string;
  bookmarkAction?: JobAction;
  formattedDeadline: string;
  job: ActiveJob;
  surface: "archive" | "bookmarks" | "jobs";
};

type JobCardButtonsProps = {
  actionLabel: string;
  canBookmark: boolean;
  bookmarkedAt: string | null;
  job: ActiveJob;
  onBookmark: (form: HTMLFormElement) => void;
  onPrimary: (form: HTMLFormElement) => void;
  onOpen: () => void;
  pending: boolean;
};

function JobCardButtons({
  actionLabel,
  canBookmark,
  bookmarkedAt,
  job,
  onBookmark,
  onPrimary,
  onOpen,
  pending,
}: JobCardButtonsProps) {
  return (
    <>
      {canBookmark ? (
        <Button
          type="button"
          variant={bookmarkedAt ? "default" : "outline"}
          className="size-11 p-0 transition-none disabled:opacity-100 sm:size-10"
          aria-label={
            bookmarkedAt
              ? `Remove bookmark for ${job.title}`
              : `Bookmark ${job.title}`
          }
          aria-disabled={pending}
          disabled={pending}
          onClick={(event) => {
            if (event.currentTarget.form) {
              onBookmark(event.currentTarget.form);
            }
          }}
        >
          <Bookmark
            className={bookmarkedAt ? "size-4 fill-current" : "size-4"}
            aria-hidden="true"
          />
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="size-11 p-0 sm:size-10"
        aria-label={`${actionLabel} ${job.title}`}
        aria-disabled={pending}
        disabled={pending}
        onClick={(event) => {
          if (event.currentTarget.form) {
            onPrimary(event.currentTarget.form);
          }
        }}
      >
        <Archive className="size-4" aria-hidden="true" />
      </Button>

      <Button asChild className="h-11 min-w-0 flex-1 sm:h-9 sm:flex-none">
        <a
          href={job.detailUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${job.title}`}
          onClick={onOpen}
        >
          Open
          <ArrowUpRight className="size-4" />
        </a>
      </Button>
    </>
  );
}

export function JobCard({
  action,
  actionLabel,
  bookmarkAction,
  formattedDeadline,
  job,
  surface,
}: JobCardProps) {
  const [optimisticallyRemoved, removeOptimistically] = useState(false);
  const [optimisticBookmarkedAt, setOptimisticBookmarkedAt] = useState(
    job.bookmarkedAt,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const commonJobProperties = {
    has_deadline: Boolean(job.deadlineAt),
    job_function_count: job.jobFunctions.length,
    job_id: job.id,
    surface,
  } as const;

  async function runPrimaryAction(form: HTMLFormElement) {
    setError("");
    const request = action(new FormData(form));
    removeOptimistically(true);

    try {
      await request;
      captureProductEvent("job action completed", {
        ...commonJobProperties,
        action: actionLabel === "Unarchive" ? "restored" : "archived",
      });
    } catch {
      removeOptimistically(false);
      setError(`Could not ${actionLabel.toLowerCase()} this job. Please try again.`);
      captureProductEvent("job action failed", {
        action: actionLabel === "Unarchive" ? "restored" : "archived",
        job_id: job.id,
        surface,
      });
    }
  }

  async function runBookmarkAction(form: HTMLFormElement) {
    if (!bookmarkAction) {
      return;
    }

    setError("");
    const previousBookmarkedAt = optimisticBookmarkedAt;
    const request = bookmarkAction(new FormData(form));
    setPending(true);
    setOptimisticBookmarkedAt(
      previousBookmarkedAt ? null : new Date().toISOString(),
    );

    try {
      await request;
      captureProductEvent("job action completed", {
        ...commonJobProperties,
        action: previousBookmarkedAt ? "bookmark_removed" : "bookmarked",
      });
    } catch {
      setOptimisticBookmarkedAt(previousBookmarkedAt);
      setError("Could not update this bookmark. Please try again.");
      captureProductEvent("job action failed", {
        action: previousBookmarkedAt ? "bookmark_removed" : "bookmarked",
        job_id: job.id,
        surface,
      });
    } finally {
      setPending(false);
    }
  }

  if (optimisticallyRemoved) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{job.company}</p>
          <h2 className="text-xl font-semibold leading-[1.2]">{job.title}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            <span>{formattedDeadline}</span>
          </p>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <form className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <input type="hidden" name="jobId" value={job.id} />
          <input
            type="hidden"
            name="bookmarkedAt"
            value={optimisticBookmarkedAt ?? ""}
          />
          <JobCardButtons
            actionLabel={actionLabel}
            canBookmark={Boolean(bookmarkAction)}
            bookmarkedAt={optimisticBookmarkedAt}
            job={job}
            onBookmark={runBookmarkAction}
            onPrimary={runPrimaryAction}
            onOpen={() =>
              captureProductEvent("job action completed", {
                ...commonJobProperties,
                action: "opened",
              })
            }
            pending={pending}
          />
        </form>
      </CardContent>
    </Card>
  );
}
