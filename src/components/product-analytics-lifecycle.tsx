"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import {
  captureProductEvent,
  identifyProductAnalyticsUser,
  resetProductAnalytics,
  safeAnalyticsPath,
  safeErrorName,
} from "@/lib/product-analytics";

const webVitalNames = new Set(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]);
const webVitalRatings = new Set(["good", "needs-improvement", "poor"]);

export function ProductAnalyticsLifecycle() {
  const pathname = usePathname();
  const session = authClient.useSession();
  const identifiedUserRef = useRef<string | null>(null);
  const userId = session.data?.user.id;

  useReportWebVitals((metric) => {
    captureProductEvent("web vital measured", {
      metric: webVitalNames.has(metric.name)
        ? (metric.name as "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB")
        : "unknown",
      navigation_type: metric.navigationType || "unknown",
      rating: webVitalRatings.has(metric.rating)
        ? (metric.rating as "good" | "needs-improvement" | "poor")
        : "unknown",
      value: metric.value,
    });
  });

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    let cancelled = false;

    async function capturePageView() {
      if (userId) {
        await identifyProductAnalyticsUser(userId);
        identifiedUserRef.current = userId;
      } else if (identifiedUserRef.current) {
        await resetProductAnalytics();
        identifiedUserRef.current = null;
      }

      if (!cancelled) {
        captureProductEvent("page viewed", {
          authenticated: Boolean(userId),
          path: safeAnalyticsPath(pathname),
        });
      }
    }

    void capturePageView();
    return () => {
      cancelled = true;
    };
  }, [pathname, session.isPending, userId]);

  useEffect(() => {
    const captureWindowError = (event: ErrorEvent) => {
      captureProductEvent("application error occurred", {
        error_name: safeErrorName(event.error),
        path: safeAnalyticsPath(window.location.pathname),
        source: "window_error",
      });
    };
    const captureUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureProductEvent("application error occurred", {
        error_name: safeErrorName(event.reason),
        path: safeAnalyticsPath(window.location.pathname),
        source: "unhandled_rejection",
      });
    };

    window.addEventListener("error", captureWindowError);
    window.addEventListener("unhandledrejection", captureUnhandledRejection);

    return () => {
      window.removeEventListener("error", captureWindowError);
      window.removeEventListener(
        "unhandledrejection",
        captureUnhandledRejection,
      );
    };
  }, []);

  return null;
}
