import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-3 px-3 pb-24 pt-4 sm:gap-4 sm:px-6 sm:py-8"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} aria-hidden="true">
          <CardContent className="flex items-center justify-between gap-5 p-5">
            <div className="flex-1 space-y-3">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="hidden gap-2 sm:flex">
              <div className="size-10 animate-pulse rounded-md bg-muted" />
              <div className="h-10 w-20 animate-pulse rounded-md bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Loading…</span>
    </main>
  );
}
