import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PublicLanding() {
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-56px)] w-full max-w-3xl place-items-center px-4 py-8">
      <section className="grid w-full gap-6 text-center">
        <div className="grid gap-3">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:whitespace-nowrap sm:text-3xl">
            Find high quality jobs in Dhaka.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="block">
              Dhaka Index is a curated list of top openings.
            </span>
            <span className="block">
              Find a job and build your resume, without any clutter.
            </span>
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild className="w-full sm:w-auto sm:min-w-28">
            <Link href="/signup">Sign up</Link>
          </Button>
          <Link
            className="text-sm font-medium text-foreground underline underline-offset-4"
            href="/login"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
