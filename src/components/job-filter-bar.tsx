import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActiveJobFilters } from "@/lib/job-search";
import { JOB_FUNCTIONS } from "@/lib/job-functions";

type JobFilterBarProps = {
  filters: ActiveJobFilters;
};

export function JobFilterBar({ filters }: JobFilterBarProps) {
  return (
    <div className="bg-background py-2" role="search">
      <form
        action="/"
        method="get"
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_14rem_auto]"
      >
        <label className="relative col-start-1 row-start-1 block">
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
            placeholder="Search jobs"
            className="job-search-input pl-9 shadow-none"
          />
        </label>

        <div className="col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <span id="job-function-filter-label" className="sr-only">
            Filter by job function
          </span>
          <Select
            key={`function-${filters.jobFunction || "all"}`}
            name="function"
            defaultValue={filters.jobFunction || "all"}
          >
            <SelectTrigger
              aria-labelledby="job-function-filter-label"
              className="h-9 w-full"
            >
              <SelectValue
                className="min-w-0 flex-1 text-left"
                placeholder="All job functions"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All job functions</SelectItem>
              {JOB_FUNCTIONS.map((jobFunction) => (
                <SelectItem key={jobFunction} value={jobFunction}>
                  {jobFunction}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          size="sm"
          className="col-start-2 row-start-1 sm:col-start-3 sm:px-4"
        >
          Apply
        </Button>
      </form>
    </div>
  );
}
