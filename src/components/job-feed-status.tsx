"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { JobFeedStatus as FeedStatus } from "@/lib/job-feed";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function formatTimestamp(value: string | null) {
  if (!value) {
    return "waiting for the first update";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export function JobFeedStatus({
  initialStatus,
}: {
  initialStatus: FeedStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  const synchronize = useCallback(() => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/jobs/sync", {
          method: "POST",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as FeedStatus & {
          changes?: {
            inserted: number;
            updated: number;
            resurfaced: number;
            expired: number;
          };
          error?: string;
        };

        if (!response.ok) {
          setStatus((current) => ({
            ...current,
            lastError: payload.error || "The job feed could not be updated.",
          }));
          return;
        }

        setStatus(payload);

        if (
          payload.changes &&
          Object.values(payload.changes).some((value) => value > 0)
        ) {
          router.refresh();
        }
      } catch {
        setStatus((current) => ({
          ...current,
          lastError: "The job feed could not be reached.",
        }));
      }
    });
  }, [router]);

  useEffect(() => {
    synchronize();
    const interval = window.setInterval(synchronize, SIX_HOURS_MS);
    return () => window.clearInterval(interval);
  }, [synchronize]);

  const healthy = status.configured && !status.lastError;

  return (
    <section className="relative overflow-hidden rounded-xl border bg-card px-4 py-3 text-card-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-foreground"
      />
      <div className="flex items-center justify-between gap-4 pl-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${
                healthy ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <p className="text-sm font-medium">
              {healthy ? "Dhaka job index is connected" : "Job index needs attention"}
            </p>
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {status.lastError ||
              `Feed generated ${formatTimestamp(status.feedGeneratedAt)}`}
          </p>
        </div>

        <Button
          aria-label="Check for job updates"
          className="shrink-0"
          disabled={isPending}
          onClick={synchronize}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-3.5 ${isPending ? "animate-spin" : ""}`}
          />
          Check
        </Button>
      </div>
    </section>
  );
}
