"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { authClient } from "@/app/lib/auth-client";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        startTransition(async () => {
          const result = await authClient.signIn.email({
            email,
            password,
          });

          if (result.error) {
            setError(result.error.message || "Authentication failed.");
            return;
          }

          router.push(callbackUrl);
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1.5 text-sm font-medium">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          autoComplete="email"
          inputMode="email"
          required
          type="email"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        Password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          autoComplete="current-password"
          minLength={8}
          required
          type="password"
        />
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Please wait" : "Sign in"}
      </button>
    </form>
  );
}
