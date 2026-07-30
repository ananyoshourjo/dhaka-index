import { redirect } from "next/navigation";

import { AdminSetupForm } from "@/components/admin-setup-form";
import { hasAnyAdmin, isFirstRegisteredUser } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const user = await requireUser();

  if (hasAnyAdmin()) {
    redirect("/");
  }

  if (!isFirstRegisteredUser(user.id)) {
    return (
      <main className="mx-auto grid min-h-[calc(100dvh-120px)] w-full max-w-lg place-items-center px-4 py-8 sm:min-h-[calc(100dvh-56px)]">
        <section className="w-full rounded-xl border bg-card p-5 text-card-foreground sm:rounded-2xl sm:p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Ownership pending
          </p>
          <h1 className="mt-3 text-2xl font-semibold">The first account must finish setup</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Only the first registered account can claim administrator access for this
            installation.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-120px)] w-full max-w-lg place-items-center px-4 py-8 sm:min-h-[calc(100dvh-56px)] sm:py-10">
      <section className="w-full overflow-hidden rounded-xl border bg-card text-card-foreground sm:rounded-2xl">
        <div className="border-b bg-foreground px-5 py-5 text-background sm:px-7 sm:py-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-background/65">
            First-run ownership
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Claim this installation</h1>
        </div>
        <div className="grid gap-5 p-5 sm:p-7">
          <p className="text-sm leading-6 text-muted-foreground">
            Enter the one-time code printed by the Dhaka Index server. The code is
            removed as soon as administrator access is claimed.
          </p>
          <AdminSetupForm />
        </div>
      </section>
    </main>
  );
}
