"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  mode: "login" | "signup";
  requiresSetupCode?: boolean;
};

export function AuthForm({ mode, requiresSetupCode = false }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const isSignup = mode === "signup";

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        startTransition(async () => {
          const result = isSignup
            ? await authClient.signUp.email({
                email,
                password,
                name: name || email,
              })
            : await authClient.signIn.email({
                email,
                password,
              });

          if (result.error) {
            setError(result.error.message || "Authentication failed.");
            return;
          }

          if (isSignup && requiresSetupCode) {
            const claimResponse = await fetch("/api/setup/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: setupCode }),
            });
            const claimResult = (await claimResponse.json()) as {
              error?: string;
            };

            if (!claimResponse.ok) {
              setError(
                claimResult.error ||
                  "Your account was created, but administrator setup failed.",
              );
              return;
            }
          }

          router.push(callbackUrl);
          router.refresh();
        });
      }}
    >
      {isSignup ? (
        <label className="grid gap-1.5 text-sm font-medium">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            autoComplete="name"
          />
        </label>
      ) : null}

      {isSignup && requiresSetupCode ? (
        <label className="grid gap-1.5 text-sm font-medium">
          Initial administrator code
          <input
            value={setupCode}
            onChange={(event) => setSetupCode(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
            autoComplete="one-time-code"
            maxLength={128}
            required
            type="text"
          />
          <span className="text-xs font-normal text-muted-foreground">
            Printed in the server console on first launch.
          </span>
        </label>
      ) : null}

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
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
          type="password"
        />
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Please wait" : isSignup ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}
