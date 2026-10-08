import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobDetail } from "@/lib/cloud-db";
import { todayDhaka } from "@/lib/time";
import { applicationRequiresLogin } from "@/lib/job-content";

export function JobDetailView({ job }: { job: JobDetail }) {
  const closed = Boolean(
    job.expiredAt || (job.deadlineAt && job.deadlineAt < todayDhaka()),
  );
  const deadline = job.deadlineAt
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Dhaka",
      }).format(new Date(`${job.deadlineAt}T00:00:00+06:00`))
    : "Not specified";
  const email = job.applyUrl?.startsWith("mailto:");
  const login = job.applyUrl ? applicationRequiresLogin(job.applyUrl) : false;
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:px-6 sm:py-8">
      <Link
        href="/"
        className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All jobs
      </Link>
      <article className="overflow-hidden rounded-xl border bg-card">
        <header className="space-y-5 border-b p-5 sm:p-8">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {job.company}
            </p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {job.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {job.jobFunctions.map((label) => (
              <span
                key={label}
                className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
              >
                {label}
              </span>
            ))}
            {closed ? (
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                Applications closed
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              Deadline: {deadline}
            </p>
            {job.applyUrl && job.description && !closed ? (
              <Button asChild className="h-11 sm:min-w-36">
                <a
                  href={job.applyUrl}
                  target={email ? undefined : "_blank"}
                  rel="noopener noreferrer"
                >
                  {email
                    ? "Apply by email"
                    : login
                      ? "Log in to apply"
                      : "Apply now"}
                  {email ? (
                    <Mail className="size-4" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  )}
                </a>
              </Button>
            ) : (
              <Button disabled className="h-11">
                {closed ? "Applications closed" : "Apply link unavailable"}
              </Button>
            )}
          </div>
        </header>
        <div className="space-y-8 p-5 sm:p-8">
          <section aria-labelledby="description-heading">
            <h2 id="description-heading" className="mb-5 text-lg font-semibold">
              About this role
            </h2>
            {job.description ? (
              <div className="space-y-4 text-[15px] leading-7 text-foreground/85">
                {job.description
                  .split(/\n\s*\n/)
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line break-words">
                      {paragraph}
                    </p>
                  ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                The employer’s description is currently unavailable. You can
                check the original listing below.
              </p>
            )}
          </section>
          {job.applicationInstructions ? (
            <section
              aria-labelledby="application-heading"
              className="rounded-lg bg-muted/60 p-4 sm:p-5"
            >
              <h2 id="application-heading" className="mb-3 font-semibold">
                How to apply
              </h2>
              <p className="whitespace-pre-line break-words text-sm leading-6">
                {job.applicationInstructions}
              </p>
            </section>
          ) : null}
          <footer className="border-t pt-5">
            <a
              href={job.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Original listing
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </footer>
        </div>
      </article>
    </main>
  );
}
