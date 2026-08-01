"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { authClient } from "@/lib/auth-client";
import { JOB_FUNCTIONS, type JobFunction } from "@/lib/job-functions";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [preferredJobFunction, setPreferredJobFunction] = useState<
    JobFunction | ""
  >("");
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

        if (isSignup && !preferredJobFunction) {
          setError("Choose a job interest.");
          return;
        }

        startTransition(async () => {
          const result = isSignup
            ? await authClient.signUp.email({
                email,
                password,
                name: name || email,
                preferredJobFunction: preferredJobFunction as JobFunction,
              })
            : await authClient.signIn.email({
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
      {isSignup ? (
        <label className="grid gap-1.5 text-sm font-medium">
          Name
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10"
            autoComplete="name"
            required
          />
        </label>
      ) : null}

      {isSignup ? (
        <label className="grid gap-1.5 text-sm font-medium">
          Job interest
          <NativeSelect
            aria-describedby="job-interest-description"
            name="preferredJobFunction"
            onChange={(event) =>
              setPreferredJobFunction(event.target.value as JobFunction | "")
            }
            required
            value={preferredJobFunction}
          >
            <option value="" disabled>
              Select a job function
            </option>
            {JOB_FUNCTIONS.map((jobFunction) => (
              <option key={jobFunction} value={jobFunction}>
                {jobFunction}
              </option>
            ))}
          </NativeSelect>
          <span
            id="job-interest-description"
            className="font-normal leading-5 text-muted-foreground"
          >
            Used to keep future job alerts relevant to the work you want.
          </span>
        </label>
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium">
        Email
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10"
          autoComplete="email"
          inputMode="email"
          required
          type="email"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        Password
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10"
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
