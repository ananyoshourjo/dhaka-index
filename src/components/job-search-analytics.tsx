"use client";

import { useEffect } from "react";

import type { JobFunction } from "@/lib/job-functions";
import {
  captureProductEvent,
  queryLengthBucket,
} from "@/lib/product-analytics";

type JobSearchAnalyticsProps = {
  currentPage: number;
  jobFunction: JobFunction | "";
  queryLength: number;
  resultCount: number;
};

export function JobSearchAnalytics({
  currentPage,
  jobFunction,
  queryLength,
  resultCount,
}: JobSearchAnalyticsProps) {
  useEffect(() => {
    captureProductEvent("job search results viewed", {
      current_page: currentPage,
      has_query: queryLength > 0,
      job_function: jobFunction || "All",
      query_length: queryLengthBucket(queryLength),
      result_count: resultCount,
      zero_results: resultCount === 0,
    });
  }, [currentPage, jobFunction, queryLength, resultCount]);

  return null;
}
