import { ArrowUpRight, Download } from "lucide-react";

import { AccountDangerZone } from "@/components/account-danger-zone";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const administrator = isAdmin(user.id);
  const adminUrl = process.env.ADMIN_PORTAL_URL ?? "http://127.0.0.1:3010";

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Manage your account, security, and local data.
        </p>
      </header>

      <div className="mt-6 divide-y border-y sm:mt-8">
        <section className="grid gap-6 py-7 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <div>
            <h2 className="font-semibold">Account</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The identity used to sign in to this installation.
            </p>
          </div>
          <dl className="grid max-w-md gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 font-medium">{user.email}</dd>
            </div>
          </dl>
        </section>

        <ChangePasswordForm />

        <section className="grid gap-6 py-7 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <div>
            <h2 className="font-semibold">Your data</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Your account and resume data stay inside this installation.
            </p>
          </div>
          <div className="max-w-md">
            <p className="text-sm leading-6 text-muted-foreground">
              Download a portable copy of your profile, resume, bookmarks, and
              archive.
            </p>
            <Button asChild className="mt-4 w-full sm:w-auto" variant="outline">
              <a href="/api/account/export">
                <Download className="size-4" />
                Export my data
              </a>
            </Button>
          </div>
        </section>

        {administrator ? (
          <section className="grid gap-6 py-7 sm:grid-cols-[minmax(0,14rem)_1fr]">
            <div>
              <h2 className="font-semibold">Administration</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Manage this local installation.
              </p>
            </div>
            <div className="max-w-md">
              <p className="text-sm leading-6 text-muted-foreground">
                Review users and apply local corrections to job records.
              </p>
              <Button asChild className="mt-4 w-full sm:w-auto" variant="outline">
                <a href={adminUrl} rel="noreferrer" target="_blank">
                  Open admin portal
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </div>
          </section>
        ) : null}

        <AccountDangerZone />
      </div>
    </main>
  );
}
