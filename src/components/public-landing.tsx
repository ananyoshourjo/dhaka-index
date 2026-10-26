import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GulshanAscii } from "@/components/gulshan-ascii";

export function PublicLanding() {
  return (
    <main className="public-landing relative isolate grid min-h-[calc(100svh-56px)] w-full place-items-center overflow-hidden px-6 py-8 sm:min-h-[calc(100dvh-56px)] sm:px-4">
      <GulshanAscii />
      <section className="public-landing-copy relative z-10 grid w-full max-w-3xl gap-6 text-center">
        <div className="grid gap-3">
          <h1 className="text-[clamp(1.625rem,6.7vw,2rem)] font-semibold leading-[1.18] tracking-tight text-balance sm:text-5xl sm:leading-tight lg:text-6xl">
            Find high quality jobs in Dhaka, without the noise
          </h1>
          <p className="mx-auto max-w-[30rem] text-base leading-6 text-pretty text-muted-foreground sm:max-w-none sm:text-2xl sm:leading-9">
            <span className="sm:block">
              Dhaka Index is a curated list of top openings.
            </span>{" "}
            <span className="sm:block">
              Find a job and build your resume, without any clutter.
            </span>
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-xs flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4">
          <Button asChild className="h-12 w-full text-base sm:h-10 sm:w-auto sm:min-w-28 sm:text-sm">
            <Link href="/signup">Sign up</Link>
          </Button>
          <Button asChild variant="secondary" className="h-12 w-full text-base sm:h-10 sm:w-auto sm:min-w-28 sm:text-sm">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
