import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-56px)] w-full max-w-sm place-items-center px-4 py-8">
      <section className="grid w-full gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your email and password to access Dhaka Index.
          </p>
        </div>
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </section>
    </main>
  );
}
