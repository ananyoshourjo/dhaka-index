export default function LoadingJob() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" role="status">
      <span className="sr-only">Loading job…</span>
      <div
        aria-hidden="true"
        className="space-y-6 rounded-xl border p-5 sm:p-8"
      >
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-3/4 rounded bg-muted" />
        <div className="flex justify-between gap-4">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-11 w-36 rounded-md bg-muted" />
        </div>
        <div className="space-y-3 border-t pt-6">
          {["w-full", "w-full", "w-4/5", "w-full", "w-3/5"].map(
            (width, index) => (
              <div key={index} className={`h-4 rounded bg-muted ${width}`} />
            ),
          )}
        </div>
      </div>
    </main>
  );
}
