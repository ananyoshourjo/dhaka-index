"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { JOB_FUNCTIONS, type JobFunction } from "@/lib/job-functions";
import { captureProductEvent } from "@/lib/product-analytics";

type JobInterestFormProps = {
  currentJobFunction: JobFunction;
};

export function JobInterestForm({
  currentJobFunction,
}: JobInterestFormProps) {
  const router = useRouter();
  const [jobFunction, setJobFunction] = useState(currentJobFunction);
  const [savedJobFunction, setSavedJobFunction] = useState(currentJobFunction);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasChanged = jobFunction !== savedJobFunction;

  return (
    <section
      aria-labelledby="job-interest-settings-heading"
      className="grid gap-6 py-7 sm:grid-cols-[minmax(0,14rem)_1fr]"
    >
      <div>
        <h2 id="job-interest-settings-heading" className="font-semibold">
          Job interest
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choose the work you want future job alerts to prioritize.
        </p>
      </div>

      <form
        className="grid max-w-md gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setSuccess(null);

          if (!hasChanged) {
            return;
          }

          startTransition(async () => {
            const result = await authClient.updateUser({
              preferredJobFunction: jobFunction,
            });

            if (result.error) {
              setError(
                result.error.message || "Your job interest could not be updated.",
              );
              captureProductEvent("job interest updated", {
                current_job_function: jobFunction,
                outcome: "failed",
                previous_job_function: savedJobFunction,
              });
              return;
            }

            captureProductEvent("job interest updated", {
              current_job_function: jobFunction,
              outcome: "succeeded",
              previous_job_function: savedJobFunction,
            });
            setSavedJobFunction(jobFunction);
            setSuccess("Your job interest has been updated.");
            router.refresh();
          });
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Preferred job function
          <Select
            disabled={isPending}
            onValueChange={(value) => {
              setJobFunction(value as JobFunction);
              setError(null);
              setSuccess(null);
            }}
            value={jobFunction}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_FUNCTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div aria-live="polite">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? (
            <p className="text-sm text-emerald-700">{success}</p>
          ) : null}
        </div>

        <div>
          <Button
            className="w-full sm:w-auto"
            disabled={!hasChanged || isPending}
            type="submit"
          >
            {isPending ? "Saving interest" : "Save job interest"}
          </Button>
        </div>
      </form>
    </section>
  );
}
