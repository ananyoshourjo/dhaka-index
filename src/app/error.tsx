"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  captureProductEvent,
  safeAnalyticsPath,
  safeErrorName,
} from "@/lib/product-analytics";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureProductEvent("application error occurred", {
      error_name: safeErrorName(error),
      path: safeAnalyticsPath(window.location.pathname),
      source: "route_boundary",
    });
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-56px)] w-full max-w-md place-items-center px-4 py-12 text-center">
      <section className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Dhaka Index could not finish loading this page. Try again.
          </p>
        </div>
        <div>
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        </div>
      </section>
    </main>
  );
}
