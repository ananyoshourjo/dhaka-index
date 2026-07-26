import { ArrowUpRight, Database, Download, RadioTower } from "lucide-react";

import { AccountDangerZone } from "@/components/account-danger-zone";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/db";
import { getJobFeedStatus } from "@/lib/job-feed";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not yet synchronized";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default async function SettingsPage() {
  const user = await requireUser();
  const administrator = isAdmin(user.id);
  const feed = getJobFeedStatus();
  const adminUrl = process.env.ADMIN_PORTAL_URL ?? "http://127.0.0.1:3010";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Local installation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your account and resume data stay inside this installation. Dhaka Index
          does not include telemetry or upload personal information.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border bg-card p-6 text-card-foreground">
          <Database className="size-5" aria-hidden="true" />
          <h2 className="mt-5 text-lg font-semibold">Your local data</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Download a portable copy of your profile, resume, bookmarks, and archive.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <a href="/api/account/export">
              <Download className="size-4" />
              Export my data
            </a>
          </Button>
        </article>

        <article className="rounded-2xl border bg-card p-6 text-card-foreground">
          <RadioTower className="size-5" aria-hidden="true" />
          <h2 className="mt-5 text-lg font-semibold">Public job feed</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {feed.lastError ||
              `Last synchronized ${formatTimestamp(feed.lastSuccessAt)}.`}
          </p>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            Checks at startup and every six hours
          </p>
        </article>
      </section>

      {administrator ? (
        <section className="flex flex-col gap-4 rounded-2xl border bg-foreground p-6 text-background sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-background/60">
              Administrator
            </p>
            <h2 className="mt-2 text-xl font-semibold">Manage this installation</h2>
            <p className="mt-1 text-sm text-background/70">
              Review users and apply local corrections to job records.
            </p>
          </div>
          <Button asChild className="shrink-0" variant="secondary">
            <a href={adminUrl} rel="noreferrer" target="_blank">
              Open admin portal
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </section>
      ) : null}

      <AccountDangerZone />
    </main>
  );
}
