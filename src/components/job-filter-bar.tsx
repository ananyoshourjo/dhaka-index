"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SENIORITY_LEVELS } from "@/lib/job-seniority";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createJobsHref, parseActiveJobFilters, type ActiveJobFilters } from "@/lib/job-search";
import { JOB_FUNCTIONS } from "@/lib/job-functions";

type JobFilterBarProps = {
  filters: ActiveJobFilters;
};

export function JobFilterBar({ filters }: JobFilterBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.query);
  const [jobFunction, setJobFunction] = useState(filters.jobFunction || "all");
  const [seniority, setSeniority] = useState(filters.seniority || "all");
  const draft = useRef({ ...filters });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);

  useEffect(() => {
    const restore = () => {
      if (timer.current) clearTimeout(timer.current);
      const restored = parseActiveJobFilters(Object.fromEntries(new URLSearchParams(location.search)));
      draft.current = restored;
      setQuery(restored.query);
      setJobFunction(restored.jobFunction || "all");
      setSeniority(restored.seniority || "all");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function apply() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const href = createJobsHref(draft.current);
    startTransition(() => router.replace(href, { scroll: false }));
  }

  return (
    <div className="bg-background py-2" role="search" aria-busy={pending}>
      <form
        onSubmit={(event) => { event.preventDefault(); apply(); }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]"
      >
        <label className="relative col-span-2 col-start-1 row-start-1 block sm:col-span-1">
          <span className="sr-only">
            Search job title, company, or job function
          </span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={input}
            type="search"
            name="q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              draft.current.query = event.target.value;
              if (timer.current) clearTimeout(timer.current);
              if (!composing.current) timer.current = setTimeout(apply, 250);
            }}
            onCompositionStart={() => { composing.current = true; if (timer.current) clearTimeout(timer.current); }}
            onCompositionEnd={(event) => {
              composing.current = false;
              draft.current.query = event.currentTarget.value;
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(apply, 250);
            }}
            placeholder="Search jobs"
            className="job-search-input pl-9 shadow-none"
          />
        </label>

        <div className="col-start-1 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <span id="job-function-filter-label" className="sr-only">
            Filter by job function
          </span>
          <Select
            name="function"
            value={jobFunction}
            onValueChange={(value) => {
              setJobFunction(value);
              draft.current.jobFunction = value === "all" ? "" : value as ActiveJobFilters["jobFunction"];
              apply();
            }}
          >
            <SelectTrigger
              aria-labelledby="job-function-filter-label"
              className="h-9 w-full"
            >
              <SelectValue
                className="min-w-0 flex-1 text-left"
                placeholder="All Categories"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {JOB_FUNCTIONS.map((jobFunction) => (
                <SelectItem key={jobFunction} value={jobFunction}>
                  {jobFunction}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1">
          <span id="seniority-filter-label" className="sr-only">Filter by seniority level</span>
          <Select name="seniority" value={seniority} onValueChange={(value) => {
            setSeniority(value);
            draft.current.seniority = value === "all" ? "" : value as ActiveJobFilters["seniority"];
            apply();
          }}>
            <SelectTrigger aria-labelledby="seniority-filter-label" className="h-9 w-full">
              <SelectValue placeholder="All seniority levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All seniority levels</SelectItem>
              {SENIORITY_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>


      </form>
    </div>
  );
}
