"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import type { JobFeedStatus } from "@/lib/job-feed";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function JobFeedSync() {
  const router = useRouter();

  const synchronize = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs/sync", {
        method: "POST",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as JobFeedStatus & {
        changes?: {
          inserted: number;
          updated: number;
          resurfaced: number;
          expired: number;
        };
      };

      if (
        payload.changes &&
        Object.values(payload.changes).some((value) => value > 0)
      ) {
        router.refresh();
      }
    } catch {
      // The next scheduled sync will retry transient network failures.
    }
  }, [router]);

  useEffect(() => {
    void synchronize();
    const interval = window.setInterval(() => void synchronize(), SIX_HOURS_MS);
    return () => window.clearInterval(interval);
  }, [synchronize]);

  return null;
}
