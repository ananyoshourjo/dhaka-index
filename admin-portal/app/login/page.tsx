import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSession } from "@/app/lib/session";
import { AdminLoginForm } from "@/app/login/admin-login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-sm place-items-center px-4">
      <section className="grid w-full gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-2xl font-semibold">Admin sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use an approved Dhaka Index account to access the admin portal.
          </p>
        </div>
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </section>
    </main>
  );
}
