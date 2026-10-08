export default function LoadingJob() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" role="status">
      <span className="sr-only">Loading job…</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="flex justify-between gap-4">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-3/4 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-11 w-24 rounded-md bg-muted sm:h-9" />
        <div className="space-y-4 border-y py-7">
          {["w-full", "w-full", "w-4/5", "w-full", "w-3/5"].map((width, index) => (
            <div key={index} className={`h-4 rounded bg-muted ${width}`} />
          ))}
        </div>
      </div>
    </main>
  );
}
