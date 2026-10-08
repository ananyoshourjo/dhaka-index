"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Link2 } from "lucide-react";

const actionClass = "inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4";

export function JobPageActions({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setCopied(true);
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className={actionClass}>
          <ArrowLeft className="size-4" aria-hidden="true" />All jobs
        </Link>
        <button type="button" className={actionClass} onClick={copyLink}>
          <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {error ? <p role="status" className="text-right text-xs text-muted-foreground">Copy the link from your browser’s address bar.</p> : null}
    </div>
  );
}
