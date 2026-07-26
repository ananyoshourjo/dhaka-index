"use client";

import { ArrowUpRight, CalendarDays, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { AdminJob, EditableJobField } from "@/app/lib/jobs";

type JobAction = (formData: FormData) => Promise<void>;

type EditableFieldProps = {
  field: EditableJobField;
  jobId: number;
  updateAction: JobAction;
  value: string | null;
};

function formatDeadline(deadlineAt: string | null) {
  if (!deadlineAt) {
    return "Deadline not listed";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(`${deadlineAt}T00:00:00+06:00`));
}

function EditableField({ field, jobId, updateAction, value }: EditableFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValue = value ?? "";
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [draftValue, setDraftValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function cancelEditing() {
    setDraftValue(currentValue);
    setEditing(false);
  }

  function save() {
    const nextValue = draftValue.trim();

    if (field !== "deadline" && !nextValue) {
      cancelEditing();
      return;
    }

    if (nextValue === currentValue) {
      setEditing(false);
      return;
    }

    const previousValue = currentValue;
    const formData = new FormData();
    formData.set("jobId", String(jobId));
    formData.set("field", field);
    formData.set("value", nextValue);

    setCurrentValue(nextValue);
    setEditing(false);

    startTransition(async () => {
      try {
        await updateAction(formData);
        router.refresh();
      } catch {
        setCurrentValue(previousValue);
        setDraftValue(previousValue);
      }
    });
  }

  const inputClassName =
    field === "title"
      ? "w-full rounded-md border bg-background px-2 py-1 text-base font-semibold leading-snug outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-lg"
      : "w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={field === "deadline" ? "date" : "text"}
        value={draftValue}
        aria-label={`Edit job ${field}`}
        className={inputClassName}
        maxLength={field === "deadline" ? undefined : 240}
        onBlur={save}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            cancelEditing();
          }
        }}
      />
    );
  }

  if (field === "deadline") {
    return (
      <button
        type="button"
        aria-label="Edit deadline"
        className={`-mx-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
          isPending ? "opacity-60" : ""
        }`}
        onClick={() => {
          setDraftValue(currentValue);
          setEditing(true);
        }}
      >
        <CalendarDays className="size-4" aria-hidden="true" />
        <span>{formatDeadline(currentValue || null)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Edit ${field === "title" ? "role" : "company"}`}
      className={`-mx-2 block max-w-full rounded-md px-2 py-1 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        field === "title"
          ? "text-base font-semibold leading-snug sm:text-lg"
          : "text-sm text-muted-foreground"
      } ${isPending ? "opacity-60" : ""}`}
      onClick={() => {
        setDraftValue(currentValue);
        setEditing(true);
      }}
    >
      {currentValue}
    </button>
  );
}

type EditableJobCardProps = {
  deleteAction: JobAction;
  job: AdminJob;
  updateAction: JobAction;
};

export function EditableJobCard({
  deleteAction,
  job,
  updateAction,
}: EditableJobCardProps) {
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();

  function deleteJob() {
    if (!window.confirm(`Delete ${job.title} from Dhaka Index?`)) {
      return;
    }

    const formData = new FormData();
    formData.set("jobId", String(job.id));

    startDeleteTransition(async () => {
      await deleteAction(formData);
      router.refresh();
    });
  }

  return (
    <article className="rounded-xl border bg-card text-card-foreground">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <EditableField
            key={`company-${job.company}`}
            field="company"
            jobId={job.id}
            updateAction={updateAction}
            value={job.company}
          />
          <EditableField
            key={`title-${job.title}`}
            field="title"
            jobId={job.id}
            updateAction={updateAction}
            value={job.title}
          />
          <EditableField
            key={`deadline-${job.deadlineAt ?? "none"}`}
            field="deadline"
            jobId={job.id}
            updateAction={updateAction}
            value={job.deadlineAt}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Delete ${job.title}`}
            className="inline-flex size-10 items-center justify-center rounded-md border bg-background text-destructive transition-colors hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            disabled={isDeleting}
            onClick={deleteJob}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>

          <a
            href={job.detailUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${job.title}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Open
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
