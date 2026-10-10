import { ArrowUpRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JobDescription } from "@/components/job-description";
import { JobPageActions } from "@/components/job-page-actions";
import type { JobDetail } from "@/lib/cloud-db";
import { todayDhaka } from "@/lib/time";
import { getJobPath } from "@/lib/job-url";
import { splitJobDescription } from "@/lib/job-description";

export function JobDetailView({ job, signedIn }: { job: JobDetail; signedIn: boolean }) {
  const content = splitJobDescription(job.description ?? "", job.applicationInstructions);
  const closed = Boolean(job.expiredAt || (job.deadlineAt && job.deadlineAt < todayDhaka()));
  const deadline = job.deadlineAt
    ? new Intl.DateTimeFormat("en", {
        day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka",
      }).format(new Date(`${job.deadlineAt}T00:00:00+06:00`))
    : "Not specified";
  const email = job.applyUrl?.startsWith("mailto:");
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:py-8">
      <JobPageActions path={getJobPath(job)} />
      <article>
        <header>
          <p className="text-sm font-medium text-muted-foreground">{job.company}</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{job.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {job.jobFunctions.map((label) => (
              <span key={label} className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">{label}</span>
            ))}
            {closed ? <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">Applications closed</span> : null}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />{deadline}
          </p>
          <div className="mt-6 sm:mt-8">
            {!signedIn && !closed ? (
              <Button asChild className="h-11 sm:h-9">
                <Link href="/login">Login to Apply<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
              </Button>
            ) : job.applyUrl && !closed ? (
              <Button asChild className="h-11 sm:h-9">
                <a href={job.applyUrl} target={email ? undefined : "_blank"} rel="noopener noreferrer">
                  Apply<ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </Button>
            ) : (
              <>
                <Button disabled className="h-11 sm:h-9" aria-describedby="apply-status">
                  Apply<ArrowUpRight className="size-4" aria-hidden="true" />
                </Button>
                <p id="apply-status" className="mt-2 text-sm text-muted-foreground">
                  {closed ? "Applications are closed." : "The application link is currently unavailable."}
                </p>
              </>
            )}
          </div>
        </header>
        <div className="mt-6 divide-y border-y sm:mt-8">
          <section aria-labelledby="description-heading" className="space-y-5 py-7">
            <h2 id="description-heading" className="font-semibold">About this role</h2>
            {content.description ? <JobDescription text={content.description} /> : (
              <p className="text-sm leading-6 text-muted-foreground">The employer’s description is currently unavailable.</p>
            )}
          </section>
          {content.hiringProcess ? (
            <section aria-labelledby="hiring-heading" className="space-y-5 py-7">
              <h2 id="hiring-heading" className="font-semibold">Hiring process</h2>
              <JobDescription text={content.hiringProcess} />
            </section>
          ) : null}
          {content.applicationInstructions ? (
            <section aria-labelledby="application-heading" className="space-y-5 py-7">
              <h2 id="application-heading" className="font-semibold">How to apply</h2>
              <JobDescription text={content.applicationInstructions} />
            </section>
          ) : null}
        </div>
      </article>
    </main>
  );
}
