"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type DeleteUserAction = (formData: FormData) => Promise<void>;

type DeleteUserButtonProps = {
  action: DeleteUserAction;
  disabled?: boolean;
  userId: string;
  userName: string;
};

export function DeleteUserButton({
  action,
  disabled = false,
  userId,
  userName,
}: DeleteUserButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function deleteUser() {
    if (
      disabled ||
      !window.confirm(
        `Delete ${userName}'s account and all of their Dhaka Index data?`,
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("userId", userId);
    setError("");

    startTransition(async () => {
      try {
        await action(formData);
        router.refresh();
      } catch {
        setError("Could not delete this user.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={
          disabled ? "You cannot delete your own account" : `Delete ${userName}`
        }
        className="size-10 text-destructive hover:bg-destructive hover:text-white sm:size-9"
        disabled={disabled || isPending}
        title={
          disabled ? "You cannot delete your own account" : `Delete ${userName}`
        }
        onClick={deleteUser}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
