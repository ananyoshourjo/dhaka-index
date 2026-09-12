"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function AccountDangerZone() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canDelete = confirmation === "DELETE" && password.length >= 8;

  return (
    <section
      aria-labelledby="delete-account-heading"
      className="grid gap-6 py-7 sm:grid-cols-[minmax(0,14rem)_1fr]"
    >
      <div>
        <h2
          id="delete-account-heading"
          className="font-semibold text-destructive"
        >
          Delete account
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          This permanently removes your account, sessions, bookmarks, archive,
          resume, cover letter, and profile photo from this installation.
        </p>
      </div>

      <form
        className="grid max-w-md gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);

          startTransition(async () => {
            const result = await authClient.deleteUser({
              callbackURL: "/signup",
              password,
            });

            if (result.error) {
              setError(result.error.message || "The account could not be deleted.");
              return;
            }

            router.push("/signup");
            router.refresh();
          });
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Password
          <input
            autoComplete="current-password"
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Type DELETE
          <input
            autoComplete="off"
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => setConfirmation(event.target.value)}
            pattern="DELETE"
            required
            type="text"
            value={confirmation}
          />
        </label>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <div>
          <Button
            className="w-full sm:w-auto"
            disabled={!canDelete || isPending}
            type="submit"
            variant="destructive"
          >
            {isPending ? "Deleting account" : "Delete account permanently"}
          </Button>
        </div>
      </form>
    </section>
  );
}
