"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { captureProductEvent } from "@/lib/product-analytics";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canSubmit =
    currentPassword.length >= 8 &&
    newPassword.length >= 8 &&
    newPassword === confirmation &&
    newPassword !== currentPassword;

  return (
    <section
      aria-labelledby="password-settings-heading"
      className="grid gap-6 py-7 sm:grid-cols-[minmax(0,14rem)_1fr]"
    >
      <div>
        <h2 id="password-settings-heading" className="font-semibold">
          Password
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Use at least eight characters for your new password.
        </p>
      </div>

      <form
        className="grid max-w-md gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setSuccess(null);

          if (newPassword !== confirmation) {
            setError("The new passwords do not match.");
            captureProductEvent("account password changed", {
              outcome: "failed",
            });
            return;
          }

          if (currentPassword === newPassword) {
            setError("Choose a new password that is different from your current one.");
            captureProductEvent("account password changed", {
              outcome: "failed",
            });
            return;
          }

          startTransition(async () => {
            const result = await authClient.changePassword({
              currentPassword,
              newPassword,
            });

            if (result.error) {
              setError(result.error.message || "The password could not be changed.");
              captureProductEvent("account password changed", {
                outcome: "failed",
              });
              return;
            }

            captureProductEvent("account password changed", {
              outcome: "succeeded",
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmation("");
            setSuccess("Your password has been changed.");
          });
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Current password
          <input
            autoComplete="current-password"
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            minLength={8}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          New password
          <input
            autoComplete="new-password"
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            minLength={8}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          Confirm new password
          <input
            autoComplete="new-password"
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            minLength={8}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
        </label>

        <div aria-live="polite">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? (
            <p className="text-sm text-emerald-700">{success}</p>
          ) : null}
        </div>

        <div>
          <Button
            className="w-full sm:w-auto"
            disabled={!canSubmit || isPending}
            type="submit"
          >
            {isPending ? "Updating password" : "Update password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
