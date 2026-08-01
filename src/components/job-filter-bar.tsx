import { Bookmark, CalendarCheck, Search, X } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  hasActiveJobFilters,
  type ActiveJobFilters,
} from "@/lib/job-search";
import { JOB_FUNCTIONS } from "@/lib/job-functions";
import { cn } from "@/lib/utils";

type JobFilterBarProps = {
  companies: string[];
  filters: ActiveJobFilters;
};

const toggleClassName = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "cursor-pointer select-none gap-1.5 px-2.5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:hover:bg-primary/90",
);

export function JobFilterBar({ companies, filters }: JobFilterBarProps) {
  return (
    <section
      aria-label="Search and filter jobs"
      className="sticky top-14 z-20 -mx-3 border-y bg-background/95 px-3 py-3 shadow-sm backdrop-blur sm:-mx-6 sm:px-6"
    >
      <form action="/" method="get" className="grid gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_13rem_11rem_auto]">
          <label className="relative col-span-2 col-start-1 row-start-1 block sm:col-span-1 sm:col-start-auto sm:row-start-auto">
            <span className="sr-only">
              Search job title, company, or job function
            </span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              key={`query-${filters.query}`}
              type="search"
              name="q"
              defaultValue={filters.query}
              placeholder="Search title, company, or function"
              className="pl-9"
            />
          </label>

          <label className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
            <span className="sr-only">Filter by job function</span>
            <NativeSelect
              key={`function-${filters.jobFunction || "all"}`}
              name="function"
              defaultValue={filters.jobFunction}
            >
              <option value="">All job functions</option>
              {JOB_FUNCTIONS.map((jobFunction) => (
                <option key={jobFunction} value={jobFunction}>
                  {jobFunction}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className="col-span-2 col-start-2 row-start-2 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
            <span className="sr-only">Filter by company</span>
            <NativeSelect
              key={`company-${filters.company || "all"}`}
              name="company"
              defaultValue={filters.company}
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </NativeSelect>
          </label>

          <Button
            type="submit"
            size="sm"
            className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto sm:px-4"
          >
            Apply
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-32">
            <span className="sr-only">Sort jobs</span>
            <NativeSelect
              key={`sort-${filters.sort}`}
              name="sort"
              defaultValue={filters.sort}
            >
              <option value="newest">Newest</option>
              <option value="closing">Closing soon</option>
            </NativeSelect>
          </label>

          <div>
            <input
              key={`deadline-${filters.deadlineAvailable}`}
              className="peer sr-only"
              defaultChecked={filters.deadlineAvailable}
              id="deadline-available"
              name="deadline"
              type="checkbox"
              value="available"
            />
            <label className={toggleClassName} htmlFor="deadline-available">
              <CalendarCheck aria-hidden="true" className="size-4" />
              Deadline available
            </label>
          </div>

          <div>
            <input
              key={`bookmarked-${filters.bookmarkedOnly}`}
              className="peer sr-only"
              defaultChecked={filters.bookmarkedOnly}
              id="bookmarked-only"
              name="bookmarked"
              type="checkbox"
              value="1"
            />
            <label className={toggleClassName} htmlFor="bookmarked-only">
              <Bookmark aria-hidden="true" className="size-4" />
              Bookmarked
            </label>
          </div>

          {hasActiveJobFilters(filters) ? (
            <Button asChild variant="ghost" size="sm" className="px-2.5">
              <Link href="/">
                <X aria-hidden="true" className="size-4" />
                Clear
              </Link>
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
