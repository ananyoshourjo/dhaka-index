"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function AdminSetupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        startTransition(async () => {
          const response = await fetch("/api/setup/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          const result = (await response.json()) as { error?: string };

          if (!response.ok) {
            setError(result.error || "Administrator setup failed.");
            return;
          }

          router.push("/");
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1.5 text-sm font-medium">
        One-time setup code
        <input
          autoComplete="one-time-code"
          autoFocus
          className="h-11 rounded-md border bg-background px-3 font-mono text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-ring"
          maxLength={128}
          onChange={(event) => setCode(event.target.value)}
          required
          type="text"
          value={code}
        />
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button disabled={isPending} type="submit">
        {isPending ? "Claiming access" : "Claim administrator access"}
      </Button>
    </form>
  );
}
