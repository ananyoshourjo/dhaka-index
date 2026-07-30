"use client";

import { format, parseISO } from "date-fns";
import { ArrowUpRight, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { AdminJob, EditableJobField } from "@/app/lib/jobs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  function save(valueOverride?: string) {
    const nextValue = (valueOverride ?? draftValue).trim();

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
      ? "h-9 w-full rounded-md border bg-background px-2 !text-xl font-semibold leading-[1.2] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : "w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (field === "deadline") {
    const selectedDate = draftValue ? parseISO(draftValue) : undefined;

    return (
      <Popover
        open={editing}
        onOpenChange={(open) => {
          if (open) {
            setDraftValue(currentValue);
          }
          setEditing(open);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Edit deadline"
            className={`group/edit -mx-2 flex items-center gap-1.5 rounded-md px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
              isPending ? "opacity-60" : ""
            }`}
            disabled={isPending}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            <span>{formatDeadline(currentValue || null)}</span>
            <Pencil
              className="size-3 shrink-0 opacity-55 transition-opacity sm:opacity-0 sm:group-hover/edit:opacity-55 sm:group-focus-visible/edit:opacity-55"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            required
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => {
              const nextValue = format(date, "yyyy-MM-dd");
              setDraftValue(nextValue);
              save(nextValue);
            }}
          />
          {currentValue ? (
            <div className="border-t p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setDraftValue("");
                  save("");
                }}
              >
                Clear deadline
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draftValue}
        aria-label={`Edit job ${field}`}
        className={inputClassName}
        maxLength={240}
        onBlur={() => save()}
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

  return (
    <button
      type="button"
      aria-label={`Edit ${field === "title" ? "role" : "company"}`}
      className={`group/edit -mx-2 flex max-w-full items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        field === "title"
          ? "text-xl font-semibold leading-[1.2]"
          : "text-sm text-muted-foreground"
      } ${isPending ? "opacity-60" : ""}`}
      onClick={() => {
        setDraftValue(currentValue);
        setEditing(true);
      }}
    >
      <span>{currentValue}</span>
      <Pencil
        className="size-3 shrink-0 text-muted-foreground opacity-55 transition-opacity sm:opacity-0 sm:group-hover/edit:opacity-55 sm:group-focus-visible/edit:opacity-55"
        aria-hidden="true"
      />
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
    <article className="overflow-hidden rounded-xl border bg-card text-card-foreground">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
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

        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Delete ${job.title}`}
            className="size-11 text-destructive hover:bg-destructive hover:text-white sm:size-10"
            disabled={isDeleting}
            onClick={deleteJob}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>

          <Button
            asChild
            className="h-11 min-w-0 flex-1 sm:h-9 sm:flex-none"
          >
            <a
              href={job.detailUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${job.title}`}
            >
              Open
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
