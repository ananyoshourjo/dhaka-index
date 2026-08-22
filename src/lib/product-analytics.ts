import type { PostHog } from "posthog-js/dist/module.slim";

import type { JobFunction } from "@/lib/job-functions";

type JobAction =
  | "archived"
  | "bookmark_removed"
  | "bookmarked"
  | "opened"
  | "restored";

type ProductAnalyticsEventMap = {
  "account authentication failed": {
    mode: "login" | "signup";
    stage: "provider" | "validation";
  };
  "account deletion completed": Record<string, never>;
  "account deletion failed": Record<string, never>;
  "account deletion started": Record<string, never>;
  "account export requested": Record<string, never>;
  "account logged in": Record<string, never>;
  "account logged out": Record<string, never>;
  "account password changed": { outcome: "failed" | "succeeded" };
  "account signed up": { preferred_job_function: JobFunction };
  "application error occurred": {
    error_name: string;
    path: SafeAnalyticsPath;
    source: "route_boundary" | "unhandled_rejection" | "window_error";
  };
  "job action completed": {
    action: JobAction;
    has_deadline: boolean;
    job_function_count: number;
    job_id: number;
    surface: "archive" | "bookmarks" | "jobs";
  };
  "job action failed": {
    action: Exclude<JobAction, "opened">;
    job_id: number;
    surface: "archive" | "bookmarks" | "jobs";
  };
  "job interest updated": {
    current_job_function: JobFunction;
    outcome: "failed" | "succeeded";
    previous_job_function: JobFunction;
  };
  "job search results viewed": {
    current_page: number;
    has_query: boolean;
    job_function: JobFunction | "All";
    query_length: "1-3" | "11-25" | "26+" | "4-10" | "none";
    result_count: number;
    zero_results: boolean;
  };
  "page viewed": {
    authenticated: boolean;
    path: SafeAnalyticsPath;
  };
  "profile photo changed": {
    action: "removed" | "uploaded";
    outcome: "failed" | "succeeded";
  };
  "resume draft restored": Record<string, never>;
  "resume editing started": Record<string, never>;
  "resume pdf downloaded": {
    cover_letter_included: boolean;
    document_type: "cover_letter" | "resume";
    resume_page_count: number;
    section_count: number;
  };
  "resume pdf failed": {
    document_type: "cover_letter" | "resume";
  };
  "resume save completed": Record<string, never>;
  "resume save failed": Record<string, never>;
  "web vital measured": {
    metric: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB" | "unknown";
    navigation_type: string;
    rating: "good" | "needs-improvement" | "poor" | "unknown";
    value: number;
  };
};

export type ProductAnalyticsEventName = keyof ProductAnalyticsEventMap;
export type ProductAnalyticsProperties<
  EventName extends ProductAnalyticsEventName,
> = ProductAnalyticsEventMap[EventName];

export type SafeAnalyticsPath =
  | "/"
  | "/archive"
  | "/bookmarks"
  | "/login"
  | "/profile"
  | "/settings"
  | "/signup"
  | "other";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
let postHogPromise: Promise<PostHog | null> | null = null;

const blockedProperties = [
  "$current_url",
  "$initial_current_url",
  "$initial_pathname",
  "$initial_referrer",
  "$initial_referring_domain",
  "$pathname",
  "$referrer",
  "$referring_domain",
  "cover_letter",
  "email",
  "name",
  "password",
  "query",
  "resume",
  "search_query",
  "url",
];
const blockedPropertySet = new Set(blockedProperties);

function removeBlockedProperties<Value>(value: Value): Value {
  if (Array.isArray(value)) {
    return value.map(removeBlockedProperties) as Value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blockedPropertySet.has(key))
      .map(([key, nestedValue]) => [key, removeBlockedProperties(nestedValue)]),
  ) as Value;
}

export function isProductAnalyticsConfigured() {
  return Boolean(projectToken && apiHost);
}

export function safeAnalyticsPath(pathname: string): SafeAnalyticsPath {
  switch (pathname) {
    case "/":
    case "/archive":
    case "/bookmarks":
    case "/login":
    case "/profile":
    case "/settings":
    case "/signup":
      return pathname;
    default:
      return "other";
  }
}

export function queryLengthBucket(length: number) {
  if (length <= 0) return "none" as const;
  if (length <= 3) return "1-3" as const;
  if (length <= 10) return "4-10" as const;
  if (length <= 25) return "11-25" as const;
  return "26+" as const;
}

export function safeErrorName(value: unknown) {
  const name = value instanceof Error ? value.name : "UnknownError";
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  return safeName || "UnknownError";
}

export async function initializeProductAnalytics() {
  if (typeof window === "undefined" || !projectToken || !apiHost) {
    return null;
  }

  postHogPromise ??= import("posthog-js/dist/module.slim").then(
    ({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(projectToken, {
          api_host: apiHost,
          advanced_disable_flags: true,
          autocapture: false,
          capture_dead_clicks: false,
          capture_exceptions: false,
          capture_heatmaps: false,
          capture_pageleave: false,
          capture_pageview: false,
          capture_performance: false,
          before_send: (event) =>
            event
              ? {
                  ...event,
                  $set: removeBlockedProperties(event.$set),
                  $set_once: removeBlockedProperties(event.$set_once),
                  properties: {
                    ...removeBlockedProperties(event.properties),
                    $geoip_disable: true,
                  },
                }
              : null,
          disable_session_recording: true,
          disable_surveys: true,
          person_profiles: "identified_only",
          property_denylist: blockedProperties,
          respect_dnt: true,
        });
      }

      return posthog;
    },
  );

  return postHogPromise;
}

export function captureProductEvent<EventName extends ProductAnalyticsEventName>(
  event: EventName,
  properties: ProductAnalyticsProperties<EventName>,
) {
  void initializeProductAnalytics().then((posthog) => {
    posthog?.capture(event, { ...properties });
  });
}

export async function identifyProductAnalyticsUser(userId: string) {
  const posthog = await initializeProductAnalytics();
  posthog?.identify(userId);
}

export async function resetProductAnalytics() {
  const posthog = await initializeProductAnalytics();
  posthog?.reset();
}
