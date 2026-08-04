"use client";

import {
  Check,
  Download,
  Eye,
  GripVertical,
  Loader2,
  Maximize2,
  Minus,
  PencilLine,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { saveResumeAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPhotoThumbnail } from "@/lib/photo-client";
import {
  hasResumeContent,
  normalizeResumeCustomSections,
  normalizeResumeSectionOrder,
  normalizeResumeSectionTitles,
} from "@/lib/resume-schema";
import type {
  ResumeAchievement,
  ResumeActivity,
  ResumeBullet,
  ResumeCertification,
  ResumeCertificationStatus,
  ResumeContent,
  ResumeCustomEntry,
  ResumeCustomSection,
  ResumeCustomSectionId,
  ResumeEducation,
  ResumePublication,
  ResumePublicationStatus,
  ResumeReference,
  ResumeSectionId,
  ResumeSectionKey,
  ResumeSkillGroup,
  ResumeWorkExperience,
} from "@/lib/resume";
import { normalizeResumeLink } from "@/lib/resume-links";
import { cn } from "@/lib/utils";

type ResumeBuilderProps = {
  initialResume: ResumeContent;
  subtitle?: string;
  title?: string;
  showPreview?: boolean;
};

type SaveState = "failed" | "saved" | "saving" | "unsaved";
type DragTarget = {
  group: string;
  id: string;
};
type DropIndicator = DragTarget & {
  position: "before" | "after";
};

const certificationStatusOptions: ReadonlyArray<{
  label: string;
  value: ResumeCertificationStatus;
}> = [
  { label: "Completed", value: "completed" },
  { label: "In progress", value: "inProgress" },
];

const publicationStatusOptions: ReadonlyArray<{
  label: string;
  value: ResumePublicationStatus;
}> = [
  { label: "Published", value: "published" },
  { label: "In press", value: "inPress" },
  { label: "Under review", value: "underReview" },
];

function publicationStatusLabel(status: ResumePublicationStatus) {
  return publicationStatusOptions.find((option) => option.value === status)?.label ?? "Published";
}

function publicationDateLabel(status: ResumePublicationStatus) {
  if (status === "inPress") {
    return "Expected publication date";
  }

  if (status === "underReview") {
    return "Submission date";
  }

  return "Publication date";
}

const EMERGENCY_DRAFT_KEY = "dhaka-index:resume-emergency-draft:v1";

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function readEmergencyDraft() {
  try {
    const stored = window.localStorage.getItem(EMERGENCY_DRAFT_KEY);

    if (!stored) {
      return null;
    }

    const value = JSON.parse(stored) as { resume?: ResumeContent };
    const resume = value.resume;

    if (
      resume?.contact &&
      resume.summary &&
      Array.isArray(resume.workExperience) &&
      Array.isArray(resume.education)
    ) {
      return resume;
    }
  } catch {
    return null;
  }

  return null;
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newCustomSectionId() {
  return `custom:${newId("section")}` as ResumeCustomSectionId;
}

function newCustomEntry(): ResumeCustomEntry {
  return {
    id: newId("custom-entry"),
    included: true,
    heading: "",
    subheading: "",
    link: "",
    place: "",
    dates: "",
    useBullets: false,
    description: "",
    bullets: [],
  };
}

function newResumeBullet(): ResumeBullet {
  return {
    id: newId("bullet"),
    included: true,
    text: "",
  };
}

function reorderById<T extends { id: string }>(
  items: T[],
  fromId: string,
  toId: string,
  position: "before" | "after" = "before",
) {
  const fromIndex = items.findIndex((item) => item.id === fromId);
  const toIndex = items.findIndex((item) => item.id === toId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  const adjustedToIndex = next.findIndex((item) => item.id === toId);
  next.splice(position === "after" ? adjustedToIndex + 1 : adjustedToIndex, 0, moved);
  return next;
}

function Toggle({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      draggable={false}
      onClick={onClick}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded border",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input text-muted-foreground",
      )}
      aria-label={label}
    >
      {checked ? <Check className="size-3.5" /> : null}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url";
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="bg-background text-foreground"
      />
    </label>
  );
}

function Switch({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      draggable={false}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors",
        checked
          ? "border-primary bg-primary"
          : "border-input bg-muted",
      )}
    >
      <span
        className={cn(
          "size-3.5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as T)}
      >
        <SelectTrigger
          aria-label={label}
          className="h-9 text-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function TextArea({
  label,
  value,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    autoResizeTextarea(textareaRef.current);
  }, [value]);

  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <textarea
        ref={textareaRef}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y overflow-hidden rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </label>
  );
}

function autoResizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function EditorSection({
  title,
  onTitleChange,
  children,
  action,
  dragId,
  dragGroup,
  dragTarget,
  onDragStart,
  onDragEnd,
  onDragOverTarget,
  onDrop,
  order,
  dropIndicator,
}: {
  title: string;
  onTitleChange?: (value: string) => void;
  children: React.ReactNode;
  action?: React.ReactNode;
  dragId?: string;
  dragGroup?: string;
  dragTarget?: DragTarget | null;
  onDragStart?: (
    group: string,
    id: string,
    event?: React.DragEvent<Element>,
  ) => void;
  onDragEnd?: () => void;
  onDragOverTarget?: (
    event: React.DragEvent<HTMLElement>,
    group: string,
    id: string,
  ) => void;
  onDrop?: (group: string, id: string) => void;
  order?: number;
  dropIndicator?: DropIndicator | null;
}) {
  const draggable = Boolean(dragId && dragGroup && onDragStart && onDrop);
  const isDragging =
    Boolean(dragGroup && dragId) &&
    dragTarget?.group === dragGroup &&
    dragTarget?.id === dragId;
  const indicator =
    dragGroup && dragId && dropIndicator?.group === dragGroup && dropIndicator.id === dragId
      ? dropIndicator.position
      : null;

  return (
    <section
      className={cn(
        "relative grid gap-4 rounded-md transition-opacity duration-150",
        isDragging && "opacity-55",
        indicator === "before" &&
          "before:absolute before:-top-3 before:left-0 before:right-0 before:h-1 before:rounded-full before:bg-primary",
        indicator === "after" &&
          "after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-1 after:rounded-full after:bg-primary",
      )}
      draggable={draggable}
      onDragStart={(event) => {
        if ((event.target as Element | null)?.closest("input,button,textarea,select")) {
          event.preventDefault();
          return;
        }

        if (dragGroup && dragId) {
          onDragStart?.(dragGroup, dragId, event);
        }
      }}
      onDragOver={(event) => {
        if (draggable) {
          onDragOverTarget?.(event, dragGroup!, dragId!);
        }
      }}
      onDrop={() => {
        if (dragGroup && dragId) {
          onDrop?.(dragGroup, dragId);
        }
      }}
      style={order === undefined ? undefined : { order }}
    >
      <div className="flex items-center justify-between border-b pb-2">
        <div className="inline-flex items-center gap-2">
          {draggable ? (
            <GripVertical
              className="size-4 cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
              aria-hidden="true"
            />
          ) : null}
          {onTitleChange ? (
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              aria-label={`${title || "Section"} title`}
              draggable={false}
              className="min-w-0 bg-transparent text-sm font-semibold text-foreground outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          ) : (
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PreviewSection({
  title,
  children,
  order,
}: {
  title: string;
  children: React.ReactNode;
  order?: number;
}) {
  return (
    <section
      className="grid gap-[7px]"
      style={order === undefined ? undefined : { order }}
    >
      {title.trim() ? (
        <h3 className="border-b-[2px] border-black pb-[2px] text-[13px] font-bold uppercase leading-none">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

function pairRows<T>(items: T[]) {
  const rows: Array<[T, T | null]> = [];

  for (let index = 0; index < items.length; index += 2) {
    rows.push([items[index], items[index + 1] ?? null]);
  }

  return rows;
}

function splitParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const previewLinkClassName = "text-blue-700 underline";

function contactUrl(protocol: "mailto" | "tel", value: string) {
  const normalized = value.trim();
  return normalized ? `${protocol}:${encodeURIComponent(normalized)}` : "";
}

function safeLinkedInUrl(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(normalized)
    ? normalized
    : /^(www\.)?linkedin\.com/i.test(normalized)
      ? `https://${normalized}`
      : `https://linkedin.com/${normalized.replace(/^\/+/, "")}`;

  return normalizeResumeLink(candidate);
}

function ResumePreviewLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return <>{children}</>;
  }

  const opensNewTab = /^https?:/i.test(href);

  return (
    <a
      href={href}
      target={opensNewTab ? "_blank" : undefined}
      rel={opensNewTab ? "noreferrer" : undefined}
      className={previewLinkClassName}
    >
      {children}
    </a>
  );
}

function CoverLetterPreview({
  left,
  resume,
}: {
  left: string;
  resume: ResumeContent;
}) {
  const coverLetter = resume.coverLetter;
  const contactItems = [
    {
      label: "Phone",
      value: resume.contact.phone,
      href: contactUrl("tel", resume.contact.phone),
    },
    {
      label: "Email",
      value: resume.contact.email,
      href: contactUrl("mailto", resume.contact.email),
    },
    {
      label: "LinkedIn",
      value: resume.contact.linkedin,
      href: safeLinkedInUrl(resume.contact.linkedin),
    },
  ].filter((item) => item.value.trim());

  return (
    <article
      className="absolute top-0 h-[11in] w-[8.5in] overflow-hidden bg-transparent p-[1in] text-[11pt] leading-[1.45] text-black"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", left }}
    >
      <header className="border-b border-neutral-300 pb-[0.18in]">
        <h2 className="text-[17pt] font-bold tracking-[0.01em]">
          {resume.contact.name}
        </h2>
        <p className="mt-[0.06in] text-[9.5pt] text-neutral-700">
          {contactItems.map((item, index) => (
            <span key={`${item.value}-${index}`}>
              {index > 0 ? " | " : null}
              {item.label}: {" "}
              <ResumePreviewLink href={item.href}>
                {item.value}
              </ResumePreviewLink>
            </span>
          ))}
        </p>
      </header>

      <div className="mt-[0.42in] grid gap-[0.18in]">
        {splitParagraphs(coverLetter.body).map((paragraph, index) => (
          <p
            key={index}
            className={cn(
              "whitespace-pre-line",
              coverLetter.justifyBody && "text-justify",
            )}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}

export function ResumeBuilder({
  initialResume,
  showPreview = true,
  subtitle = "CV format editor",
  title = "Resume Builder",
}: ResumeBuilderProps) {
  const initialCustomSections = normalizeResumeCustomSections(
    initialResume.customSections,
  );
  const [resume, setResume] = useState<ResumeContent>({
    ...initialResume,
    contact: {
      ...initialResume.contact,
      website: initialResume.contact.website ?? "",
      photoUrl: "",
    },
    projects: initialResume.projects ?? [],
    publications: initialResume.publications ?? [],
    certifications: initialResume.certifications ?? [],
    sectionTitles: normalizeResumeSectionTitles(initialResume.sectionTitles),
    customSections: initialCustomSections,
    coverLetter: initialResume.coverLetter
      ? {
          ...initialResume.coverLetter,
          justifyBody: initialResume.coverLetter.justifyBody === true,
        }
      : {
          included: false,
          date: "",
          recipientName: "",
          recipientTitle: "",
          company: "",
          address: "",
          salutation: "Dear Hiring Manager,",
          body: "",
          justifyBody: false,
          closing: "Sincerely,",
        },
    sectionOrder: normalizeResumeSectionOrder(
      initialResume.sectionOrder,
      initialCustomSections.map((section) => section.id),
    ),
  });
  const [photoUrl, setPhotoUrl] = useState(initialResume.contact.photoUrl);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [downloadState, setDownloadState] = useState<SaveState>("saved");
  const [downloadError, setDownloadError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [previewZoom, setPreviewZoom] = useState(0.78);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [resumePageCount, setResumePageCount] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const didMount = useRef(false);
  const dirtyRef = useRef(false);
  const lastQueuedRevisionRef = useRef(0);
  const latestSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const navigationInProgressRef = useRef(false);
  const resumeRef = useRef(resume);
  const revisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const saveTimeoutRef = useRef<number | null>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const resumePreviewRef = useRef<HTMLElement>(null);
  const previewZoomRef = useRef(previewZoom);
  const activePreviewPointersRef = useRef(
    new Map<number, { x: number; y: number }>(),
  );
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const panStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    x: 0,
    y: 0,
  });

  const queueResumeSave = useCallback(
    (snapshot: ResumeContent, revision: number) => {
      if (
        revision <= lastQueuedRevisionRef.current &&
        latestSavePromiseRef.current
      ) {
        return latestSavePromiseRef.current;
      }

      lastQueuedRevisionRef.current = revision;
      const task = saveQueueRef.current.then(async () => {
        setSaveState("saving");

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const result = await saveResumeAction(snapshot);

            if (result.ok) {
              if (revision === revisionRef.current) {
                dirtyRef.current = false;
                window.localStorage.removeItem(EMERGENCY_DRAFT_KEY);
                setSaveState("saved");
              }

              return true;
            }

            if (!result.retryable) {
              break;
            }
          } catch {
            // Network and interrupted server-action failures are retried below.
          }

          if (attempt < 2) {
            await wait(500 * 2 ** attempt);
          }
        }

        if (revision === revisionRef.current) {
          dirtyRef.current = true;
          setSaveState("failed");
        }

        return false;
      });

      saveQueueRef.current = task.catch(() => false);
      latestSavePromiseRef.current = task;
      return task;
    },
    [],
  );

  const flushLatestResume = useCallback(() => {
    if (!dirtyRef.current) {
      return Promise.resolve(true);
    }

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    return queueResumeSave(resumeRef.current, revisionRef.current);
  }, [queueResumeSave]);

  useEffect(() => {
    previewZoomRef.current = previewZoom;
  }, [previewZoom]);

  const fitPreviewToViewport = useCallback(() => {
    const viewport = previewViewportRef.current;

    if (!viewport) {
      return;
    }

    const pageWidth = 8.5 * 96;
    const pageHeight = 11 * 96;
    const nextZoom = Math.min(
      1,
      (viewport.clientWidth - 24) / pageWidth,
      (viewport.clientHeight - 24) / pageHeight,
    );

    setPreviewZoom(Math.max(0.32, nextZoom));
    setPreviewPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (mobilePane !== "preview") {
      return;
    }

    const frame = window.requestAnimationFrame(fitPreviewToViewport);
    window.addEventListener("resize", fitPreviewToViewport);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", fitPreviewToViewport);
    };
  }, [fitPreviewToViewport, mobilePane]);

  useEffect(() => {
    const viewport = previewViewportRef.current;

    if (!showPreview || !viewport) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const sensitivity = event.ctrlKey ? 0.01 : 0.002;
      const factor = Math.exp(-event.deltaY * sensitivity);

      setPreviewZoom((current) =>
        Math.min(2, Math.max(0.32, current * factor)),
      );
    };
    const preventBrowserGesture = (event: Event) => event.preventDefault();

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("gesturestart", preventBrowserGesture, {
      passive: false,
    });
    viewport.addEventListener("gesturechange", preventBrowserGesture, {
      passive: false,
    });
    viewport.addEventListener("gestureend", preventBrowserGesture, {
      passive: false,
    });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("gesturestart", preventBrowserGesture);
      viewport.removeEventListener("gesturechange", preventBrowserGesture);
      viewport.removeEventListener("gestureend", preventBrowserGesture);
    };
  }, [showPreview]);

  useEffect(() => {
    if (mobilePane !== "preview" || !window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }

    let viewportMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    const createdViewportMeta = !viewportMeta;

    if (!viewportMeta) {
      viewportMeta = document.createElement("meta");
      viewportMeta.name = "viewport";
      document.head.appendChild(viewportMeta);
    }

    const previousContent = viewportMeta.content;
    viewportMeta.content =
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    const preventBrowserGesture = (event: Event) => event.preventDefault();

    document.addEventListener("gesturestart", preventBrowserGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventBrowserGesture, {
      passive: false,
    });

    return () => {
      document.removeEventListener("gesturestart", preventBrowserGesture);
      document.removeEventListener("gesturechange", preventBrowserGesture);

      if (createdViewportMeta) {
        viewportMeta.remove();
      } else {
        viewportMeta.content = previousContent;
      }
    };
  }, [mobilePane]);

  useEffect(() => {
    const emergencyDraft = readEmergencyDraft();

    if (!emergencyDraft) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const customSections = normalizeResumeCustomSections(
        emergencyDraft.customSections,
      );
      setResume({
        ...emergencyDraft,
        contact: { ...emergencyDraft.contact, photoUrl: "" },
        projects: emergencyDraft.projects ?? [],
        publications: emergencyDraft.publications ?? [],
        certifications: emergencyDraft.certifications ?? [],
        sectionTitles: normalizeResumeSectionTitles(
          emergencyDraft.sectionTitles,
        ),
        customSections,
        sectionOrder: normalizeResumeSectionOrder(
          emergencyDraft.sectionOrder,
          customSections.map((section) => section.id),
        ),
      });
      setSaveState("unsaved");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    resumeRef.current = resume;

    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    revisionRef.current += 1;
    const revision = revisionRef.current;
    dirtyRef.current = true;
    setSaveState("unsaved");
    window.localStorage.setItem(
      EMERGENCY_DRAFT_KEY,
      JSON.stringify({ resume, updatedAt: new Date().toISOString() }),
    );

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      void queueResumeSave(resume, revision);
    }, 650);

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [queueResumeSave, resume]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };
    const handleNavigation = (event: MouseEvent) => {
      if (!dirtyRef.current || navigationInProgressRef.current) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest("a[href]");

      if (
        !anchor ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(anchor.getAttribute("href") || "", window.location.href);

      if (
        !["http:", "https:"].includes(destination.protocol) ||
        destination.href === window.location.href
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      navigationInProgressRef.current = true;

      void flushLatestResume().then((saved) => {
        if (
          saved ||
          window.confirm(
            "Your latest resume changes could not be saved. Leave this page anyway?",
          )
        ) {
          dirtyRef.current = false;
          window.location.assign(destination.href);
          return;
        }

        navigationInProgressRef.current = false;
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleNavigation, true);
    };
  }, [flushLatestResume]);

  useLayoutEffect(() => {
    const preview = resumePreviewRef.current;

    if (!showPreview || !preview) {
      setResumePageCount(1);
      return;
    }

    const measure = () => {
      const pageWidth = 8.5 * 96;
      const paperGap = 0.5 * 96;
      const nextPageCount = Math.max(
        1,
        Math.ceil((preview.scrollWidth + paperGap) / (pageWidth + paperGap)),
      );
      setResumePageCount(nextPageCount);
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(preview);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [resume, showPreview]);

  const updateContact = (
    key: keyof ResumeContent["contact"],
    value: string,
  ) => {
    setResume((current) => ({
      ...current,
      contact: { ...current.contact, [key]: value },
    }));

  };

  const updateCoverLetter = (
    key: keyof ResumeContent["coverLetter"],
    value: string | boolean,
  ) => {
    setResume((current) => ({
      ...current,
      coverLetter: {
        ...current.coverLetter,
        [key]: value,
      },
    }));
  };

  const uploadContactPhoto = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setPhotoError("");
    setPhotoSaving(true);

    try {
      const thumbnail = await createPhotoThumbnail(file);
      const response = await fetch("/api/profile/photo", {
        method: "PUT",
        body: thumbnail,
        headers: { "Content-Type": "image/webp" },
      });
      const result = (await response.json()) as {
        error?: string;
        photoUrl?: string;
      };

      if (!response.ok || !result.photoUrl) {
        throw new Error(result.error || "The photo could not be saved.");
      }

      setPhotoUrl(result.photoUrl);
      window.dispatchEvent(
        new CustomEvent("profile-photo-change", {
          detail: { photoUrl: result.photoUrl },
        }),
      );
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "The photo could not be saved.",
      );
    } finally {
      setPhotoSaving(false);

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  const removeContactPhoto = async () => {
    setPhotoError("");
    setPhotoSaving(true);

    try {
      const response = await fetch("/api/profile/photo", { method: "DELETE" });

      if (!response.ok) {
        throw new Error("The photo could not be removed.");
      }

      setPhotoUrl("");
      window.dispatchEvent(
        new CustomEvent("profile-photo-change", { detail: { photoUrl: "" } }),
      );
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "The photo could not be removed.",
      );
    } finally {
      setPhotoSaving(false);
    }

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const updateWork = (
    id: string,
    updater: (item: ResumeWorkExperience) => ResumeWorkExperience,
  ) => {
    setResume((current) => ({
      ...current,
      workExperience: current.workExperience.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    }));
  };

  const updateCertification = (
    id: string,
    updater: (item: ResumeCertification) => ResumeCertification,
  ) => {
    setResume((current) => ({
      ...current,
      certifications: current.certifications.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    }));
  };

  const updatePublication = (
    id: string,
    updater: (item: ResumePublication) => ResumePublication,
  ) => {
    setResume((current) => ({
      ...current,
      publications: current.publications.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    }));
  };

  const updateEducation = (
    id: string,
    updater: (item: ResumeEducation) => ResumeEducation,
  ) => {
    setResume((current) => ({
      ...current,
      education: current.education.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    }));
  };

  const updateAchievement = (
    id: string,
    updater: (item: ResumeAchievement) => ResumeAchievement,
  ) => {
    setResume((current) => ({
      ...current,
      achievements: current.achievements.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    }));
  };

  const updateActivity = (
    id: string,
    updater: (item: ResumeActivity) => ResumeActivity,
  ) => {
    setResume((current) => ({
      ...current,
      activities: current.activities.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    }));
  };

  const updateSkill = (
    id: string,
    updater: (item: ResumeSkillGroup) => ResumeSkillGroup,
  ) => {
    setResume((current) => ({
      ...current,
      skills: current.skills.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    }));
  };

  const updateReference = (
    id: string,
    updater: (item: ResumeReference) => ResumeReference,
  ) => {
    setResume((current) => ({
      ...current,
      references: current.references.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    }));
  };

  const updateSectionTitle = (key: ResumeSectionKey, value: string) => {
    setResume((current) => ({
      ...current,
      sectionTitles: {
        ...current.sectionTitles,
        [key]: value,
      },
    }));
  };

  const updateCustomSection = (
    id: ResumeCustomSectionId,
    updater: (section: ResumeCustomSection) => ResumeCustomSection,
  ) => {
    setResume((current) => ({
      ...current,
      customSections: current.customSections.map((section) =>
        section.id === id ? updater(section) : section,
      ),
    }));
  };

  const updateCustomEntry = (
    sectionId: ResumeCustomSectionId,
    entryId: string,
    updater: (entry: ResumeCustomEntry) => ResumeCustomEntry,
  ) => {
    updateCustomSection(sectionId, (section) => ({
      ...section,
      entries: section.entries.map((entry) =>
        entry.id === entryId ? updater(entry) : entry,
      ),
    }));
  };

  const addCustomSection = () => {
    const section = {
      id: newCustomSectionId(),
      title: "untitled",
      entries: [],
    } satisfies ResumeCustomSection;

    setResume((current) => ({
      ...current,
      customSections: [...current.customSections, section],
      sectionOrder: [
        ...normalizeResumeSectionOrder(
          current.sectionOrder,
          current.customSections.map((item) => item.id),
        ),
        section.id,
      ],
    }));
  };

  const addCustomEntry = (sectionId: ResumeCustomSectionId) => {
    updateCustomSection(sectionId, (section) => ({
      ...section,
      entries: [...section.entries, newCustomEntry()],
    }));
  };

  const removeCustomSection = (sectionId: ResumeCustomSectionId) => {
    setResume((current) => {
      const customSections = current.customSections.filter(
        (section) => section.id !== sectionId,
      );

      return {
        ...current,
        customSections,
        sectionOrder: normalizeResumeSectionOrder(
          current.sectionOrder,
          customSections.map((section) => section.id),
        ),
      };
    });
  };

  const reorderCustomEntry = (
    sectionId: ResumeCustomSectionId,
    fromId: string,
    toId: string,
    position: "before" | "after",
  ) => {
    updateCustomSection(sectionId, (section) => ({
      ...section,
      entries: reorderById(section.entries, fromId, toId, position),
    }));
  };

  const reorderCustomBullet = (
    sectionId: ResumeCustomSectionId,
    entryId: string,
    fromBulletId: string,
    toBulletId: string,
    position: "before" | "after",
  ) => {
    updateCustomEntry(sectionId, entryId, (entry) => ({
      ...entry,
      bullets: reorderById(entry.bullets, fromBulletId, toBulletId, position),
    }));
  };

  const reorderSection = (
    fromId: string,
    toId: string,
    position: "before" | "after",
  ) => {
    setResume((current) => ({
      ...current,
      sectionOrder: reorderById(
        normalizeResumeSectionOrder(
          current.sectionOrder,
          current.customSections.map((section) => section.id),
        ).map((id) => ({ id })),
        fromId,
        toId,
        position,
      ).map((item) => item.id as ResumeSectionId),
    }));
  };

  const reorderCollection = (
    group: string,
    fromId: string,
    toId: string,
    position: "before" | "after",
  ) => {
    setResume((current) => {
      switch (group) {
        case "workExperience":
          return {
            ...current,
            workExperience: reorderById(
              current.workExperience,
              fromId,
              toId,
              position,
            ),
          };
        case "certifications":
          return {
            ...current,
            certifications: reorderById(
              current.certifications,
              fromId,
              toId,
              position,
            ),
          };
        case "publications":
          return {
            ...current,
            publications: reorderById(
              current.publications,
              fromId,
              toId,
              position,
            ),
          };
        case "education":
          return {
            ...current,
            education: reorderById(current.education, fromId, toId, position),
          };
        case "achievements":
          return {
            ...current,
            achievements: reorderById(
              current.achievements,
              fromId,
              toId,
              position,
            ),
          };
        case "activities":
          return {
            ...current,
            activities: reorderById(current.activities, fromId, toId, position),
          };
        case "skills":
          return {
            ...current,
            skills: reorderById(current.skills, fromId, toId, position),
          };
        case "references":
          return {
            ...current,
            references: reorderById(current.references, fromId, toId, position),
          };
        default:
          return current;
      }
    });
  };

  const reorderWorkBullet = (
    workId: string,
    fromBulletId: string,
    toBulletId: string,
    position: "before" | "after",
  ) => {
    updateWork(workId, (work) => ({
      ...work,
      bullets: reorderById(work.bullets, fromBulletId, toBulletId, position),
    }));
  };

  const reorderActivityBullet = (
    activityId: string,
    fromBulletId: string,
    toBulletId: string,
    position: "before" | "after",
  ) => {
    updateActivity(activityId, (activity) => ({
      ...activity,
      bullets: reorderById(activity.bullets, fromBulletId, toBulletId, position),
    }));
  };

  const handleDragStart = (
    group: string,
    id: string,
    event?: React.DragEvent<Element>,
  ) => {
    event?.dataTransfer.setData("text/plain", `${group}:${id}`);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
    setDragTarget({ group, id });
  };

  const handleDragEnd = () => {
    setDragTarget(null);
    setDropIndicator(null);
  };

  const scrollEditorDuringDrag = (clientY: number) => {
    const container = editorScrollRef.current;

    if (!container) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    const edgeSize = 120;
    const maxStep = 30;

    if (clientY < bounds.top + edgeSize) {
      const strength = (bounds.top + edgeSize - clientY) / edgeSize;
      container.scrollTop -= Math.ceil(strength * maxStep);
    } else if (clientY > bounds.bottom - edgeSize) {
      const strength = (clientY - (bounds.bottom - edgeSize)) / edgeSize;
      container.scrollTop += Math.ceil(strength * maxStep);
    }
  };

  const handleDragOverTarget = (
    event: React.DragEvent<HTMLElement>,
    group: string,
    id: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    scrollEditorDuringDrag(event.clientY);

    if (!dragTarget || dragTarget.group !== group || dragTarget.id === id) {
      setDropIndicator(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const position =
      event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    setDropIndicator((current) =>
      current?.group === group &&
      current.id === id &&
      current.position === position
        ? current
        : { group, id, position },
    );
  };

  const handleDrop = (
    group: string,
    id: string,
    position: "before" | "after" = dropIndicator?.position ?? "before",
  ) => {
    if (!dragTarget || dragTarget.group !== group || dragTarget.id === id) {
      setDragTarget(null);
      setDropIndicator(null);
      return;
    }

    if (group === "sections") {
      reorderSection(dragTarget.id, id, position);
    } else if (group.startsWith("bullets:")) {
      reorderWorkBullet(group.replace("bullets:", ""), dragTarget.id, id, position);
    } else if (group.startsWith("activityBullets:")) {
      reorderActivityBullet(
        group.replace("activityBullets:", ""),
        dragTarget.id,
        id,
        position,
      );
    } else if (group.startsWith("customEntries|")) {
      const [sectionId] = group.slice("customEntries|".length).split("|");

      if (sectionId) {
        reorderCustomEntry(
          sectionId as ResumeCustomSectionId,
          dragTarget.id,
          id,
          position,
        );
      }
    } else if (group.startsWith("customBullets|")) {
      const [sectionId, entryId] = group
        .slice("customBullets|".length)
        .split("|");

      if (sectionId && entryId) {
        reorderCustomBullet(
          sectionId as ResumeCustomSectionId,
          entryId,
          dragTarget.id,
          id,
          position,
        );
      }
    } else {
      reorderCollection(group, dragTarget.id, id, position);
    }

    setDragTarget(null);
    setDropIndicator(null);
  };

  const handleEditorDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    scrollEditorDuringDrag(event.clientY);
  };

  const handlePreviewPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePreviewPointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const pointers = [...activePreviewPointersRef.current.values()];

    if (pointers.length >= 2) {
      const [first, second] = pointers;
      pinchStartRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        zoom: previewZoomRef.current,
      };
      setIsPanning(false);
      return;
    }

    panStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: previewPan.x,
      y: previewPan.y,
    };
    setIsPanning(true);
  };

  const handlePreviewPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!activePreviewPointersRef.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    activePreviewPointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const pointers = [...activePreviewPointersRef.current.values()];

    if (pointers.length >= 2) {
      const [first, second] = pointers;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const pinchStart = pinchStartRef.current;

      if (pinchStart && pinchStart.distance > 0) {
        setPreviewZoom(
          Math.min(2, Math.max(0.32, pinchStart.zoom * (distance / pinchStart.distance))),
        );
      }

      return;
    }

    if (!isPanning) {
      return;
    }

    const start = panStartRef.current;
    setPreviewPan({
      x: start.x + event.clientX - start.pointerX,
      y: start.y + event.clientY - start.pointerY,
    });
  };

  const handlePreviewPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePreviewPointersRef.current.delete(event.pointerId);
    pinchStartRef.current = null;
    const remainingPointer = [
      ...activePreviewPointersRef.current.values(),
    ][0];

    if (remainingPointer) {
      panStartRef.current = {
        pointerX: remainingPointer.x,
        pointerY: remainingPointer.y,
        x: previewPan.x,
        y: previewPan.y,
      };
      setIsPanning(true);
    } else {
      setIsPanning(false);
    }
  };

  const requestPdf = async (document: "resume" | "coverLetter") => {
    const response = await fetch("/api/resume/pdf", {
      body: JSON.stringify({ document, resume, sectionOrder }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      let message = "PDF download failed.";

      try {
        const payload = (await response.json()) as { error?: string };
        message = payload.error || message;
      } catch {
        message = `PDF download failed (${response.status}).`;
      }

      throw new Error(message);
    }

    return response.blob();
  };

  const saveDownloadedBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const downloadPdf = async () => {
    setDownloadState("saving");
    setDownloadError("");

    try {
      const safeName = (resume.contact.name || "resume")
        .trim()
        .replace(/[<>:"/\\|?*]+/g, "-");
      const resumePdf = await requestPdf("resume");
      saveDownloadedBlob(resumePdf, `${safeName}-resume.pdf`);

      if (resume.coverLetter.included) {
        const coverLetterPdf = await requestPdf("coverLetter");
        saveDownloadedBlob(coverLetterPdf, `${safeName}-cover-letter.pdf`);
      }

      setDownloadState("saved");
    } catch (error) {
      setDownloadState("unsaved");
      setDownloadError(
        error instanceof Error ? error.message : "PDF download failed.",
      );
    }
  };

  const visibleWork = resume.workExperience.filter((item) => item.included);
  const visibleEducation = resume.education.filter((item) => item.included);
  const visiblePublications = resume.publications.filter(
    (item) => item.included,
  );
  const visibleCertifications = resume.certifications.filter(
    (item) => item.included,
  );
  const visibleAchievements = resume.achievements.filter((item) => item.included);
  const visibleActivities = resume.activities.filter((item) => item.included);
  const visibleSkills = resume.skills.filter((item) => item.included);
  const visibleReferences = resume.references.filter((item) => item.included);
  const sectionOrder = normalizeResumeSectionOrder(
    resume.sectionOrder,
    resume.customSections.map((section) => section.id),
  );
  const totalPreviewPages =
    resumePageCount + (resume.coverLetter.included ? 1 : 0);
  const hasPreviewContent = hasResumeContent(resume, photoUrl);
  const previewContactItems = [
    {
      label: "Phone",
      value: resume.contact.phone,
      href: contactUrl("tel", resume.contact.phone),
    },
    {
      label: "Email",
      value: resume.contact.email,
      href: contactUrl("mailto", resume.contact.email),
    },
    {
      label: "LinkedIn",
      value: resume.contact.linkedin,
      href: safeLinkedInUrl(resume.contact.linkedin),
    },
    {
      label: "Website",
      value: resume.contact.website,
      href: normalizeResumeLink(resume.contact.website),
    },
  ].filter((item) => item.value.trim());

  return (
    <main
      className={cn(
        "grid bg-muted",
        showPreview
          ? "h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] overflow-hidden sm:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(720px,48vw)_minmax(0,1fr)]"
          : "mx-auto min-h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] w-full max-w-3xl sm:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-1",
      )}
    >
      <section
        className={cn(
          "min-h-0 flex-col bg-background lg:border-r",
          showPreview && "overflow-hidden",
          showPreview && mobilePane === "preview" ? "hidden lg:flex" : "flex",
        )}
      >
        {showPreview ? (
          <div className="z-[1] flex min-h-16 shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h1 className="text-base font-semibold">{title}</h1>
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {saveState === "saving" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : saveState === "failed" ? (
                  <TriangleAlert className="size-3.5 text-destructive" />
                ) : (
                  <Check className="size-3.5 text-primary" />
                )}
                <span>
                  {saveState === "saved"
                    ? "Saved"
                    : saveState === "saving"
                      ? "Saving"
                      : saveState === "failed"
                        ? "Save failed"
                        : "Unsaved"}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobilePane("preview")}
              >
                <Eye className="size-4" />
                Preview
              </Button>
            </div>
          </div>
        ) : null}

        <div
          ref={editorScrollRef}
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-7 px-4 py-5 sm:gap-6 sm:px-5",
            showPreview && "overflow-y-auto",
          )}
          onDragOver={handleEditorDragOver}
        >
          <EditorSection title="Contact">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="grid gap-2 text-xs font-medium text-muted-foreground">
                  Photo
                  <div className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div
                      className="h-[1.55in] w-[1.28in] justify-self-center overflow-hidden border bg-muted sm:justify-self-auto"
                      aria-hidden="true"
                    >
                      {photoUrl ? (
                        <div
                          className="size-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url("${photoUrl}")`,
                          }}
                        />
                      ) : null}
                    </div>
                    <div className="grid gap-2">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          uploadContactPhoto(event.target.files?.[0])
                        }
                        className="sr-only"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={photoSaving}
                          onClick={() => photoInputRef.current?.click()}
                        >
                          {photoSaving ? "Saving photo" : "Choose photo"}
                        </Button>
                        {photoUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={photoSaving}
                            onClick={removeContactPhoto}
                            aria-label="Remove photo"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload a portrait image. It is compressed to a small WebP
                        and stored separately for the preview, navigation, and PDF.
                      </p>
                      {photoError ? (
                        <p className="text-xs text-destructive">{photoError}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <Field
                label="Name"
                value={resume.contact.name}
                onChange={(value) => updateContact("name", value)}
              />
              <Field
                label="Phone"
                value={resume.contact.phone}
                onChange={(value) => updateContact("phone", value)}
              />
              <Field
                label="Email"
                value={resume.contact.email}
                onChange={(value) => updateContact("email", value)}
              />
              <Field
                label="LinkedIn"
                value={resume.contact.linkedin}
                onChange={(value) => updateContact("linkedin", value)}
              />
              <Field
                label="Website"
                value={resume.contact.website}
                onChange={(value) => updateContact("website", value)}
              />
            </div>
          </EditorSection>

          <EditorSection title="Summary">
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Toggle
                checked={resume.summary.included}
                label={resume.summary.included ? "Hide summary" : "Show summary"}
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    summary: {
                      ...current.summary,
                      included: !current.summary.included,
                    },
                  }))
                }
              />
              <TextArea
                label="Profile paragraph"
                rows={4}
                value={resume.summary.value}
                onChange={(value) =>
                  setResume((current) => ({
                    ...current,
                    summary: { ...current.summary, value },
                  }))
                }
              />
            </div>
          </EditorSection>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomSection}
            >
              <Plus className="size-4" />
              Add custom section
            </Button>
          </div>

          <EditorSection
            title={resume.sectionTitles.workExperience}
            onTitleChange={(value) => updateSectionTitle("workExperience", value)}
            dragGroup="sections"
            dragId="workExperience"
            order={sectionOrder.indexOf("workExperience") + 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
            dragTarget={dragTarget}
            dropIndicator={dropIndicator}
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    workExperience: [
                      ...current.workExperience,
                      {
                        id: newId("work"),
                        included: true,
                        role: "",
                        company: "",
                        place: "",
                        dates: "",
                        bullets: [
                          {
                            id: newId("bullet"),
                            included: true,
                            text: "",
                          },
                        ],
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            {resume.workExperience.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "relative grid gap-3 rounded-md border p-3",
                  dropIndicator?.group === "workExperience" &&
                    dropIndicator.id === item.id &&
                    dropIndicator.position === "before" &&
                    "before:absolute before:-top-2 before:left-0 before:right-0 before:h-0.5 before:bg-foreground",
                  dropIndicator?.group === "workExperience" &&
                    dropIndicator.id === item.id &&
                    dropIndicator.position === "after" &&
                    "after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-foreground",
                )}
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  handleDragStart("workExperience", item.id);
                }}
                onDragOver={(event) =>
                  handleDragOverTarget(event, "workExperience", item.id)
                }
                onDrop={(event) => {
                  event.stopPropagation();
                  handleDrop("workExperience", item.id);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-left text-sm font-semibold">
                    <GripVertical
                      className="size-4 cursor-grab text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Toggle
                      checked={item.included}
                      label={item.included ? "Hide work" : "Show work"}
                      onClick={() =>
                        updateWork(item.id, (work) => ({
                          ...work,
                          included: !work.included,
                        }))
                      }
                    />
                    {item.role}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setResume((current) => ({
                        ...current,
                        workExperience: current.workExperience.filter(
                          (work) => work.id !== item.id,
                        ),
                      }))
                    }
                    aria-label="Remove work experience"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Role"
                    value={item.role}
                    onChange={(value) =>
                      updateWork(item.id, (work) => ({ ...work, role: value }))
                    }
                  />
                  <Field
                    label="Company"
                    value={item.company}
                    onChange={(value) =>
                      updateWork(item.id, (work) => ({ ...work, company: value }))
                    }
                  />
                  <Field
                    label="Place"
                    value={item.place}
                    onChange={(value) =>
                      updateWork(item.id, (work) => ({ ...work, place: value }))
                    }
                  />
                  <Field
                    label="Dates"
                    value={item.dates}
                    onChange={(value) =>
                      updateWork(item.id, (work) => ({ ...work, dates: value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  {item.bullets.map((bullet) => (
                    <BulletEditor
                      key={bullet.id}
                      bullet={bullet}
                      onToggle={() =>
                        updateWork(item.id, (work) => ({
                          ...work,
                          bullets: work.bullets.map((currentBullet) =>
                            currentBullet.id === bullet.id
                              ? {
                                  ...currentBullet,
                                  included: !currentBullet.included,
                                }
                              : currentBullet,
                          ),
                        }))
                      }
                      onChange={(value) =>
                        updateWork(item.id, (work) => ({
                          ...work,
                          bullets: work.bullets.map((currentBullet) =>
                            currentBullet.id === bullet.id
                              ? { ...currentBullet, text: value }
                              : currentBullet,
                          ),
                        }))
                      }
                      onRemove={() =>
                        updateWork(item.id, (work) => ({
                          ...work,
                          bullets: work.bullets.filter(
                            (currentBullet) => currentBullet.id !== bullet.id,
                          ),
                        }))
                      }
                      dragGroup={`bullets:${item.id}`}
                      onDragStart={handleDragStart}
                      onDragOverTarget={handleDragOverTarget}
                      onDrop={handleDrop}
                      dropIndicator={dropIndicator}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateWork(item.id, (work) => ({
                        ...work,
                        bullets: [
                          ...work.bullets,
                          {
                            id: newId("bullet"),
                            included: true,
                            text: "",
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="size-4" />
                    Add bullet
                  </Button>
                </div>
              </div>
            ))}
          </EditorSection>

          <EditorSection
            title={resume.sectionTitles.education}
            onTitleChange={(value) => updateSectionTitle("education", value)}
            dragGroup="sections"
            dragId="education"
            order={sectionOrder.indexOf("education") + 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
            dragTarget={dragTarget}
            dropIndicator={dropIndicator}
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    education: [
                      ...current.education,
                      {
                        id: newId("education"),
                        included: true,
                        year: "",
                        degree: "",
                        concentration: "",
                        institution: "",
                        result: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            {resume.education.map((item) => (
              <GridRowEditor
                key={item.id}
                included={item.included}
                title={item.institution}
                dragGroup="education"
                dragId={item.id}
                onDragStart={handleDragStart}
                onDragOverTarget={handleDragOverTarget}
                onDrop={handleDrop}
                dropIndicator={dropIndicator}
                onToggle={() =>
                  updateEducation(item.id, (education) => ({
                    ...education,
                    included: !education.included,
                  }))
                }
                onRemove={() =>
                  setResume((current) => ({
                    ...current,
                    education: current.education.filter(
                      (education) => education.id !== item.id,
                    ),
                  }))
                }
              >
                <Field
                  label="Year"
                  value={item.year}
                  onChange={(value) =>
                    updateEducation(item.id, (education) => ({
                      ...education,
                      year: value,
                    }))
                  }
                />
                <Field
                  label="Degree"
                  value={item.degree}
                  onChange={(value) =>
                    updateEducation(item.id, (education) => ({
                      ...education,
                      degree: value,
                    }))
                  }
                />
                <Field
                  label="Concentration"
                  value={item.concentration}
                  onChange={(value) =>
                    updateEducation(item.id, (education) => ({
                      ...education,
                      concentration: value,
                    }))
                  }
                />
                <Field
                  label="Institution"
                  value={item.institution}
                  onChange={(value) =>
                    updateEducation(item.id, (education) => ({
                      ...education,
                      institution: value,
                    }))
                  }
                />
                <Field
                  label="Result"
                  value={item.result}
                  onChange={(value) =>
                    updateEducation(item.id, (education) => ({
                      ...education,
                      result: value,
                    }))
                  }
                />
              </GridRowEditor>
            ))}
          </EditorSection>

          <EditorSection
            title={resume.sectionTitles.publications}
            onTitleChange={(value) => updateSectionTitle("publications", value)}
            dragGroup="sections"
            dragId="publications"
            order={sectionOrder.indexOf("publications") + 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
            dragTarget={dragTarget}
            dropIndicator={dropIndicator}
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    publications: [
                      {
                        id: newId("publication"),
                        included: true,
                        title: "",
                        authors: "",
                        venue: "",
                        status: "published",
                        date: "",
                        details: "",
                        url: "",
                      },
                      ...current.publications,
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            {resume.publications.map((item) => (
              <GridRowEditor
                key={item.id}
                included={item.included}
                title={item.title}
                dragGroup="publications"
                dragId={item.id}
                onDragStart={handleDragStart}
                onDragOverTarget={handleDragOverTarget}
                onDrop={handleDrop}
                dropIndicator={dropIndicator}
                onToggle={() =>
                  updatePublication(item.id, (publication) => ({
                    ...publication,
                    included: !publication.included,
                  }))
                }
                onRemove={() =>
                  setResume((current) => ({
                    ...current,
                    publications: current.publications.filter(
                      (publication) => publication.id !== item.id,
                    ),
                  }))
                }
              >
                <Field
                  label="Title"
                  value={item.title}
                  onChange={(value) =>
                    updatePublication(item.id, (publication) => ({
                      ...publication,
                      title: value,
                    }))
                  }
                />
                <Field
                  label="Authors"
                  value={item.authors}
                  onChange={(value) =>
                    updatePublication(item.id, (publication) => ({
                      ...publication,
                      authors: value,
                    }))
                  }
                />
                <Field
                  label="Publication / journal"
                  value={item.venue}
                  onChange={(value) =>
                    updatePublication(item.id, (publication) => ({
                      ...publication,
                      venue: value,
                    }))
                  }
                />
                <SelectField
                  label="Status"
                  value={item.status}
                  options={publicationStatusOptions}
                  onChange={(value) =>
                    updatePublication(item.id, (publication) => ({
                      ...publication,
                      status: value,
                    }))
                  }
                />
                <Field
                  label={publicationDateLabel(item.status)}
                  value={item.date}
                  onChange={(value) =>
                    updatePublication(item.id, (publication) => ({
                      ...publication,
                      date: value,
                    }))
                  }
                />
                <Field
                  label="Publication details (optional)"
                  value={item.details}
                  onChange={(value) =>
                    updatePublication(item.id, (publication) => ({
                      ...publication,
                      details: value,
                    }))
                  }
                />
                <div className="sm:col-span-2">
                  <Field
                    label="DOI or publication URL (optional)"
                    value={item.url}
                    onChange={(value) =>
                      updatePublication(item.id, (publication) => ({
                        ...publication,
                        url: value,
                      }))
                    }
                  />
                </div>
              </GridRowEditor>
            ))}
          </EditorSection>

          <EditorSection
            title={resume.sectionTitles.certifications}
            onTitleChange={(value) => updateSectionTitle("certifications", value)}
            dragGroup="sections"
            dragId="certifications"
            order={sectionOrder.indexOf("certifications") + 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
            dragTarget={dragTarget}
            dropIndicator={dropIndicator}
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    certifications: [
                      ...current.certifications,
                      {
                        id: newId("certification"),
                        included: true,
                        name: "",
                        issuer: "",
                        status: "completed",
                        issueDate: "",
                        expirationDate: "",
                        credentialId: "",
                        credentialUrl: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            {resume.certifications.map((item) => (
              <GridRowEditor
                key={item.id}
                included={item.included}
                title={item.name}
                dragGroup="certifications"
                dragId={item.id}
                onDragStart={handleDragStart}
                onDragOverTarget={handleDragOverTarget}
                onDrop={handleDrop}
                dropIndicator={dropIndicator}
                onToggle={() =>
                  updateCertification(item.id, (certification) => ({
                    ...certification,
                    included: !certification.included,
                  }))
                }
                onRemove={() =>
                  setResume((current) => ({
                    ...current,
                    certifications: current.certifications.filter(
                      (certification) => certification.id !== item.id,
                    ),
                  }))
                }
              >
                <Field
                  label="Certification"
                  value={item.name}
                  onChange={(value) =>
                    updateCertification(item.id, (certification) => ({
                      ...certification,
                      name: value,
                    }))
                  }
                />
                <Field
                  label="Issuing organization"
                  value={item.issuer}
                  onChange={(value) =>
                    updateCertification(item.id, (certification) => ({
                      ...certification,
                      issuer: value,
                    }))
                  }
                />
                <SelectField
                  label="Status"
                  value={item.status}
                  options={certificationStatusOptions}
                  onChange={(value) =>
                    updateCertification(item.id, (certification) => ({
                      ...certification,
                      status: value,
                    }))
                  }
                />
                <Field
                  label={
                    item.status === "inProgress"
                      ? "Expected completion date"
                      : "Issue date"
                  }
                  value={item.issueDate}
                  onChange={(value) =>
                    updateCertification(item.id, (certification) => ({
                      ...certification,
                      issueDate: value,
                    }))
                  }
                />
                <Field
                  label="Expiration / renewal date (optional)"
                  value={item.expirationDate}
                  onChange={(value) =>
                    updateCertification(item.id, (certification) => ({
                      ...certification,
                      expirationDate: value,
                    }))
                  }
                />
                <Field
                  label="Credential ID (optional)"
                  value={item.credentialId}
                  onChange={(value) =>
                    updateCertification(item.id, (certification) => ({
                      ...certification,
                      credentialId: value,
                    }))
                  }
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Credential URL (optional)"
                    value={item.credentialUrl}
                    onChange={(value) =>
                      updateCertification(item.id, (certification) => ({
                        ...certification,
                        credentialUrl: value,
                      }))
                    }
                  />
                </div>
              </GridRowEditor>
            ))}
          </EditorSection>

          <EditorSection
             title={resume.sectionTitles.achievements}
             onTitleChange={(value) => updateSectionTitle("achievements", value)}
            dragGroup="sections"
            dragId="achievements"
            order={sectionOrder.indexOf("achievements") + 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
            dragTarget={dragTarget}
            dropIndicator={dropIndicator}
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    achievements: [
                      ...current.achievements,
                      {
                        id: newId("achievement"),
                        included: true,
                        competition: "",
                        position: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            {resume.achievements.map((item) => (
              <GridRowEditor
                key={item.id}
                included={item.included}
                title={item.competition}
                dragGroup="achievements"
                dragId={item.id}
                onDragStart={handleDragStart}
                onDragOverTarget={handleDragOverTarget}
                onDrop={handleDrop}
                dropIndicator={dropIndicator}
                onToggle={() =>
                  updateAchievement(item.id, (achievement) => ({
                    ...achievement,
                    included: !achievement.included,
                  }))
                }
                onRemove={() =>
                  setResume((current) => ({
                    ...current,
                    achievements: current.achievements.filter(
                      (achievement) => achievement.id !== item.id,
                    ),
                  }))
                }
              >
                <Field
                  label="Competition"
                  value={item.competition}
                  onChange={(value) =>
                    updateAchievement(item.id, (achievement) => ({
                      ...achievement,
                      competition: value,
                    }))
                  }
                />
                <Field
                  label="Position"
                  value={item.position}
                  onChange={(value) =>
                    updateAchievement(item.id, (achievement) => ({
                      ...achievement,
                      position: value,
                    }))
                  }
                />
              </GridRowEditor>
            ))}
          </EditorSection>

          <EditorSection
            title={resume.sectionTitles.activities}
            onTitleChange={(value) => updateSectionTitle("activities", value)}
            dragGroup="sections"
            dragId="activities"
            order={sectionOrder.indexOf("activities") + 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
            dragTarget={dragTarget}
            dropIndicator={dropIndicator}
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    activities: [
                      ...current.activities,
                      {
                        id: newId("activity"),
                        included: true,
                        role: "",
                        organization: "",
                        dates: "",
                        bullets: [
                          {
                            id: newId("bullet"),
                            included: true,
                            text: "",
                          },
                        ],
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            {resume.activities.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "relative grid gap-3 rounded-md border p-3",
                  dropIndicator?.group === "activities" &&
                    dropIndicator.id === item.id &&
                    dropIndicator.position === "before" &&
                    "before:absolute before:-top-2 before:left-0 before:right-0 before:h-0.5 before:bg-foreground",
                  dropIndicator?.group === "activities" &&
                    dropIndicator.id === item.id &&
                    dropIndicator.position === "after" &&
                    "after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-foreground",
                )}
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  handleDragStart("activities", item.id);
                }}
                onDragOver={(event) =>
                  handleDragOverTarget(event, "activities", item.id)
                }
                onDrop={(event) => {
                  event.stopPropagation();
                  handleDrop("activities", item.id);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-left text-sm font-semibold">
                    <GripVertical
                      className="size-4 cursor-grab text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Toggle
                      checked={item.included}
                      label={item.included ? "Hide activity" : "Show activity"}
                      onClick={() =>
                        updateActivity(item.id, (activity) => ({
                          ...activity,
                          included: !activity.included,
                        }))
                      }
                    />
                    {item.role}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setResume((current) => ({
                        ...current,
                        activities: current.activities.filter(
                          (activity) => activity.id !== item.id,
                        ),
                      }))
                    }
                    aria-label="Remove activity"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Role"
                    value={item.role}
                    onChange={(value) =>
                      updateActivity(item.id, (activity) => ({
                        ...activity,
                        role: value,
                      }))
                    }
                  />
                  <Field
                    label="Organization"
                    value={item.organization}
                    onChange={(value) =>
                      updateActivity(item.id, (activity) => ({
                        ...activity,
                        organization: value,
                      }))
                    }
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Dates"
                      value={item.dates}
                      onChange={(value) =>
                        updateActivity(item.id, (activity) => ({
                          ...activity,
                          dates: value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  {item.bullets.map((bullet) => (
                    <BulletEditor
                      key={bullet.id}
                      bullet={bullet}
                      onToggle={() =>
                        updateActivity(item.id, (activity) => ({
                          ...activity,
                          bullets: activity.bullets.map((currentBullet) =>
                            currentBullet.id === bullet.id
                              ? {
                                  ...currentBullet,
                                  included: !currentBullet.included,
                                }
                              : currentBullet,
                          ),
                        }))
                      }
                      onChange={(value) =>
                        updateActivity(item.id, (activity) => ({
                          ...activity,
                          bullets: activity.bullets.map((currentBullet) =>
                            currentBullet.id === bullet.id
                              ? { ...currentBullet, text: value }
                              : currentBullet,
                          ),
                        }))
                      }
                      onRemove={() =>
                        updateActivity(item.id, (activity) => ({
                          ...activity,
                          bullets: activity.bullets.filter(
                            (currentBullet) => currentBullet.id !== bullet.id,
                          ),
                        }))
                      }
                      dragGroup={`activityBullets:${item.id}`}
                      onDragStart={handleDragStart}
                      onDragOverTarget={handleDragOverTarget}
                      onDrop={handleDrop}
                      dropIndicator={dropIndicator}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateActivity(item.id, (activity) => ({
                        ...activity,
                        bullets: [
                          ...activity.bullets,
                          {
                            id: newId("bullet"),
                            included: true,
                            text: "",
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="size-4" />
                    Add bullet
                  </Button>
                </div>
              </div>
            ))}
          </EditorSection>

          <EditorSection
            title={resume.sectionTitles.skills}
            onTitleChange={(value) => updateSectionTitle("skills", value)}
            dragGroup="sections"
            dragId="skills"
            order={sectionOrder.indexOf("skills") + 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
            dragTarget={dragTarget}
            dropIndicator={dropIndicator}
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    skills: [
                      ...current.skills,
                      {
                        id: newId("skills"),
                        included: true,
                        title: "",
                        value: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            {resume.skills.map((item) => (
              <GridRowEditor
                key={item.id}
                included={item.included}
                title={item.title}
                dragGroup="skills"
                dragId={item.id}
                onDragStart={handleDragStart}
                onDragOverTarget={handleDragOverTarget}
                onDrop={handleDrop}
                dropIndicator={dropIndicator}
                onToggle={() =>
                  updateSkill(item.id, (skill) => ({
                    ...skill,
                    included: !skill.included,
                  }))
                }
                onRemove={() =>
                  setResume((current) => ({
                    ...current,
                    skills: current.skills.filter((skill) => skill.id !== item.id),
                  }))
                }
              >
                <Field
                  label="Heading"
                  value={item.title}
                  onChange={(value) =>
                    updateSkill(item.id, (skill) => ({ ...skill, title: value }))
                  }
                />
                <div className="sm:col-span-2">
                  <TextArea
                    label="Skills"
                    value={item.value}
                    onChange={(value) =>
                      updateSkill(item.id, (skill) => ({ ...skill, value }))
                    }
                  />
                </div>
              </GridRowEditor>
            ))}
          </EditorSection>

          <EditorSection
            title={resume.sectionTitles.references}
            onTitleChange={(value) => updateSectionTitle("references", value)}
            dragGroup="sections"
            dragId="references"
            order={sectionOrder.indexOf("references") + 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverTarget={handleDragOverTarget}
            onDrop={handleDrop}
            dragTarget={dragTarget}
            dropIndicator={dropIndicator}
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setResume((current) => ({
                    ...current,
                    references: [
                      ...current.references,
                      {
                        id: newId("reference"),
                        included: true,
                        name: "",
                        title: "",
                        organization: "",
                        email: "",
                        phone: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            {resume.references.map((item) => (
              <GridRowEditor
                key={item.id}
                included={item.included}
                title={item.name}
                dragGroup="references"
                dragId={item.id}
                onDragStart={handleDragStart}
                onDragOverTarget={handleDragOverTarget}
                onDrop={handleDrop}
                dropIndicator={dropIndicator}
                onToggle={() =>
                  updateReference(item.id, (reference) => ({
                    ...reference,
                    included: !reference.included,
                  }))
                }
                onRemove={() =>
                  setResume((current) => ({
                    ...current,
                    references: current.references.filter(
                      (reference) => reference.id !== item.id,
                    ),
                  }))
                }
              >
                <Field
                  label="Name"
                  value={item.name}
                  onChange={(value) =>
                    updateReference(item.id, (reference) => ({
                      ...reference,
                      name: value,
                    }))
                  }
                />
                <Field
                  label="Title"
                  value={item.title}
                  onChange={(value) =>
                    updateReference(item.id, (reference) => ({
                      ...reference,
                      title: value,
                    }))
                  }
                />
                <Field
                  label="Organization"
                  value={item.organization}
                  onChange={(value) =>
                    updateReference(item.id, (reference) => ({
                      ...reference,
                      organization: value,
                    }))
                  }
                />
                <Field
                  label="Email"
                  value={item.email}
                  onChange={(value) =>
                    updateReference(item.id, (reference) => ({
                      ...reference,
                      email: value,
                    }))
                  }
                />
                <Field
                  label="Phone"
                  value={item.phone}
                  onChange={(value) =>
                    updateReference(item.id, (reference) => ({
                      ...reference,
                      phone: value,
                    }))
                  }
                />
              </GridRowEditor>
            ))}
          </EditorSection>

          {resume.customSections.map((section) => (
            <EditorSection
              key={section.id}
              title={section.title}
              onTitleChange={(value) =>
                updateCustomSection(section.id, (currentSection) => ({
                  ...currentSection,
                  title: value,
                }))
              }
              dragGroup="sections"
              dragId={section.id}
              order={sectionOrder.indexOf(section.id) + 1}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTarget={handleDragOverTarget}
              onDrop={handleDrop}
              dragTarget={dragTarget}
              dropIndicator={dropIndicator}
              action={
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addCustomEntry(section.id)}
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomSection(section.id)}
                    aria-label={`Remove ${section.title || "custom"} section`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              }
            >
              {section.entries.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "relative grid gap-3 rounded-md border p-3",
                    dropIndicator?.group === `customEntries|${section.id}` &&
                      dropIndicator.id === item.id &&
                      dropIndicator.position === "before" &&
                      "before:absolute before:-top-2 before:left-0 before:right-0 before:h-0.5 before:bg-foreground",
                    dropIndicator?.group === `customEntries|${section.id}` &&
                      dropIndicator.id === item.id &&
                      dropIndicator.position === "after" &&
                      "after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-foreground",
                  )}
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    handleDragStart(`customEntries|${section.id}`, item.id);
                  }}
                  onDragOver={(event) =>
                    handleDragOverTarget(
                      event,
                      `customEntries|${section.id}`,
                      item.id,
                    )
                  }
                  onDrop={(event) => {
                    event.stopPropagation();
                    handleDrop(`customEntries|${section.id}`, item.id);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 text-left text-sm font-semibold">
                      <GripVertical
                        className="size-4 cursor-grab text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Toggle
                        checked={item.included}
                        label={
                          item.included
                            ? "Hide custom entry"
                            : "Show custom entry"
                        }
                        onClick={() =>
                          updateCustomEntry(section.id, item.id, (entry) => ({
                            ...entry,
                            included: !entry.included,
                          }))
                        }
                      />
                      {item.heading}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateCustomSection(section.id, (currentSection) => ({
                          ...currentSection,
                          entries: currentSection.entries.filter(
                            (entry) => entry.id !== item.id,
                          ),
                        }))
                      }
                      aria-label="Remove custom entry"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Heading"
                      value={item.heading}
                      onChange={(value) =>
                        updateCustomEntry(section.id, item.id, (entry) => ({
                          ...entry,
                          heading: value,
                        }))
                      }
                    />
                    <Field
                      label="Subheading"
                      value={item.subheading}
                      onChange={(value) =>
                        updateCustomEntry(section.id, item.id, (entry) => ({
                          ...entry,
                          subheading: value,
                        }))
                      }
                    />
                    <Field
                      label="Link"
                      type="url"
                      value={item.link}
                      onChange={(value) =>
                        updateCustomEntry(section.id, item.id, (entry) => ({
                          ...entry,
                          link: value,
                        }))
                      }
                    />
                    <Field
                      label="Place"
                      value={item.place}
                      onChange={(value) =>
                        updateCustomEntry(section.id, item.id, (entry) => ({
                          ...entry,
                          place: value,
                        }))
                      }
                    />
                    <Field
                      label="Dates"
                      value={item.dates}
                      onChange={(value) =>
                        updateCustomEntry(section.id, item.id, (entry) => ({
                          ...entry,
                          dates: value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Switch
                      checked={item.useBullets}
                      label="Use bullet points"
                      onClick={() =>
                        updateCustomEntry(section.id, item.id, (entry) => ({
                          ...entry,
                          useBullets: !entry.useBullets,
                          bullets:
                            !entry.useBullets && entry.bullets.length === 0
                              ? [newResumeBullet()]
                              : entry.bullets,
                        }))
                      }
                    />
                    <span>Use bullet points</span>
                  </div>
                  {item.useBullets ? (
                    <div className="grid gap-2">
                      {item.bullets.map((bullet) => (
                        <BulletEditor
                          key={bullet.id}
                          bullet={bullet}
                          onToggle={() =>
                            updateCustomEntry(section.id, item.id, (entry) => ({
                              ...entry,
                              bullets: entry.bullets.map((currentBullet) =>
                                currentBullet.id === bullet.id
                                  ? {
                                      ...currentBullet,
                                      included: !currentBullet.included,
                                    }
                                  : currentBullet,
                              ),
                            }))
                          }
                          onChange={(value) =>
                            updateCustomEntry(section.id, item.id, (entry) => ({
                              ...entry,
                              bullets: entry.bullets.map((currentBullet) =>
                                currentBullet.id === bullet.id
                                  ? { ...currentBullet, text: value }
                                  : currentBullet,
                              ),
                            }))
                          }
                          onRemove={() =>
                            updateCustomEntry(section.id, item.id, (entry) => ({
                              ...entry,
                              bullets: entry.bullets.filter(
                                (currentBullet) => currentBullet.id !== bullet.id,
                              ),
                            }))
                          }
                          dragGroup={`customBullets|${section.id}|${item.id}`}
                          onDragStart={handleDragStart}
                          onDragOverTarget={handleDragOverTarget}
                          onDrop={handleDrop}
                          dropIndicator={dropIndicator}
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateCustomEntry(section.id, item.id, (entry) => ({
                            ...entry,
                            bullets: [...entry.bullets, newResumeBullet()],
                          }))
                        }
                      >
                        <Plus className="size-4" />
                        Add bullet
                      </Button>
                    </div>
                  ) : (
                    <TextArea
                      label="Description"
                      rows={4}
                      value={item.description}
                      onChange={(value) =>
                        updateCustomEntry(section.id, item.id, (entry) => ({
                          ...entry,
                          description: value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </EditorSection>
          ))}

          <EditorSection
            title="Cover Letter"
            order={sectionOrder.length + 1}
          >
            <div className="grid gap-3">
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Toggle
                  checked={resume.coverLetter.included}
                  label={
                    resume.coverLetter.included
                      ? "Hide cover letter"
                      : "Show cover letter"
                  }
                  onClick={() => {
                    const included = !resume.coverLetter.included;
                    updateCoverLetter("included", included);
                    setPreviewPan({ x: 0, y: 0 });
                  }}
                />
                <TextArea
                  label="Cover letter"
                  rows={8}
                  value={resume.coverLetter.body}
                  onChange={(value) => updateCoverLetter("body", value)}
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Switch
                  checked={resume.coverLetter.justifyBody}
                  label="Justify body text"
                  onClick={() =>
                    updateCoverLetter(
                      "justifyBody",
                      !resume.coverLetter.justifyBody,
                    )
                  }
                />
                <span>Justify body text</span>
              </div>
            </div>
          </EditorSection>
        </div>
      </section>

      {showPreview ? (
      <section
        className={cn(
          "min-h-0 flex-col overflow-hidden bg-muted/40",
          mobilePane === "edit" ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:gap-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 lg:hidden"
              onClick={() => setMobilePane("edit")}
            >
              <PencilLine className="size-4" />
              Edit
            </Button>
            <div className="grid min-w-0 gap-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Preview</span>
              <span className="truncate">
                {resume.coverLetter.included
                  ? `Letter 1 · Resume ${resumePageCount}`
                  : `Resume · ${resumePageCount} ${
                      resumePageCount === 1 ? "page" : "pages"
                    }`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-9 p-0 lg:hidden"
              aria-label="Fit page to screen"
              onClick={fitPreviewToViewport}
            >
              <Maximize2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-9 p-0"
              aria-label="Zoom out"
              onClick={() =>
                setPreviewZoom((current) => Math.max(0.32, current - 0.08))
              }
            >
              <Minus className="size-4" />
            </Button>
            <input
              aria-label="Preview zoom"
              type="range"
              min="32"
              max="200"
              value={Math.round(previewZoom * 100)}
              onChange={(event) =>
                setPreviewZoom(Number(event.target.value) / 100)
              }
              className="hidden w-28 sm:block"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-9 p-0"
              aria-label="Zoom in"
              onClick={() =>
                setPreviewZoom((current) => Math.min(2, current + 0.08))
              }
            >
              <Plus className="size-4" />
            </Button>
            <span className="hidden w-10 text-right text-xs text-muted-foreground sm:block">
              {Math.round(previewZoom * 100)}%
            </span>
            <Button
              type="button"
              size="sm"
              onClick={downloadPdf}
              disabled={downloadState === "saving"}
            >
              {downloadState === "saving" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span className="hidden sm:inline">
                Download
              </span>
              <span className="sr-only sm:hidden">Download</span>
            </Button>
          </div>
        </div>
        {downloadError ? (
          <div className="border-b bg-destructive/10 px-5 py-2 text-xs text-destructive">
            {downloadError}
          </div>
        ) : null}
        <div
          ref={previewViewportRef}
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden",
            "cursor-grab touch-none overscroll-contain",
            isPanning && "cursor-grabbing",
          )}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handlePreviewPointerMove}
          onPointerUp={handlePreviewPointerUp}
          onPointerCancel={handlePreviewPointerUp}
        >
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              height: "11in",
              transform: `translate(calc(-4.25in + ${previewPan.x}px), calc(-50% + ${previewPan.y}px)) scale(${previewZoom})`,
              transformOrigin: "4.25in 50%",
              width: `calc(${totalPreviewPages} * 8.5in + ${Math.max(0, totalPreviewPages - 1)} * 0.5in)`,
            }}
          >
          <div className="absolute inset-0 z-0 flex gap-[0.5in]">
            {Array.from({ length: totalPreviewPages }, (_, index) => (
              <div
                key={index}
                className="h-[11in] w-[8.5in] shrink-0 bg-white shadow-sm ring-1 ring-black/10"
                aria-hidden="true"
              />
            ))}
          </div>
          <article
            ref={resumePreviewRef}
            className="absolute top-0 z-10 h-[11in] w-[8.5in] overflow-visible px-[0.25in] py-[0.25in] font-sans text-black"
            style={{
              left: resume.coverLetter.included ? "9in" : "0",
              columnFill: "auto",
              columnGap: "1in",
              columnWidth: "8in",
            }}
          >
            {hasPreviewContent ? (
              <>
                <header
                  className={cn(
                    photoUrl && "grid grid-cols-[1fr_1.28in] gap-[0.25in]",
                  )}
                >
                  <div>
                    {resume.contact.name ? (
                      <h2 className="text-[18px] font-bold uppercase leading-tight">
                        {resume.contact.name}
                      </h2>
                    ) : null}
                    {previewContactItems.length > 0 ? (
                      <p className="mt-[6px] text-[11.5px] leading-tight">
                        {previewContactItems.map((item, index) => (
                          <span key={item.label}>
                            {index > 0 ? " | " : null}
                            {item.label}: {" "}
                            <ResumePreviewLink href={item.href}>
                              {item.value}
                            </ResumePreviewLink>
                          </span>
                        ))}
                      </p>
                    ) : null}
                    {resume.summary.included && resume.summary.value ? (
                      <p className="mt-[15px] max-w-[6.35in] text-[11.5px] leading-[1.18]">
                        {resume.summary.value}
                      </p>
                    ) : null}
                  </div>
                  {photoUrl ? (
                    <div className="h-[1.55in] w-[1.28in] border border-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  ) : null}
                </header>

                <div className="mt-[12px] grid gap-[9px] text-[11.5px] leading-[1.18]">
              {visibleWork.length > 0 ? (
                <PreviewSection
                  title={resume.sectionTitles.workExperience}
                  order={sectionOrder.indexOf("workExperience") + 1}
                >
                  <div className="grid gap-[7px]">
                    {visibleWork.map((item, index) => (
                      <div key={item.id}>
                        <div className="grid grid-cols-[1fr_auto] gap-4 font-bold">
                          <p>
                            {index + 1}. {item.role} -{" "}
                            <span className="font-normal italic">{item.company}</span>
                          </p>
                          <p>
                            {item.place ? (
                              <>
                                <span className="font-normal">{item.place}</span>
                                {item.dates ? " · " : ""}
                              </>
                            ) : null}
                            {item.dates}
                          </p>
                        </div>
                        <ul className="ml-[0.3in] mt-[4px] list-disc space-y-[1px]">
                          {item.bullets
                            .filter((bullet) => bullet.included && bullet.text)
                            .map((bullet) => (
                              <li key={bullet.id} className="pl-[0.02in]">
                                {bullet.text}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </PreviewSection>
              ) : null}

              {visibleEducation.length > 0 ? (
                <PreviewSection
                  title={resume.sectionTitles.education}
                  order={sectionOrder.indexOf("education") + 1}
                >
                  <table className="w-full border-collapse text-center text-[11px] leading-tight">
                    <thead>
                      <tr>
                        <TableHead>Year</TableHead>
                        <TableHead>Degree</TableHead>
                        <TableHead>Concentration</TableHead>
                        <TableHead>Institution</TableHead>
                        <TableHead>Result</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEducation.map((item) => (
                        <tr key={item.id}>
                          <TableCell>{item.year}</TableCell>
                          <TableCell>{item.degree}</TableCell>
                          <TableCell>{item.concentration}</TableCell>
                          <TableCell>{item.institution}</TableCell>
                          <TableCell>{item.result}</TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </PreviewSection>
              ) : null}

              {visiblePublications.length > 0 ? (
                <PreviewSection
                  title={resume.sectionTitles.publications}
                  order={sectionOrder.indexOf("publications") + 1}
                >
                  <div className="grid gap-[7px]">
                    {visiblePublications.map((item) => {
                      const publicationUrl = normalizeResumeLink(item.url);
                      const statusLabel =
                        item.status === "published"
                          ? ""
                          : publicationStatusLabel(item.status);
                      const publicationTitle = item.title ? (
                        publicationUrl ? (
                          <ResumePreviewLink href={publicationUrl}>
                            {item.title}
                          </ResumePreviewLink>
                        ) : (
                          item.title
                        )
                      ) : null;
                      const venue = [item.venue, item.details]
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <div key={item.id}>
                          <div className="grid grid-cols-[1fr_auto] gap-4 font-bold">
                            <p>
                              {publicationTitle}
                              {statusLabel ? (
                                <span className="font-normal italic">
                                  {publicationTitle ? ` (${statusLabel})` : statusLabel}
                                </span>
                              ) : null}
                            </p>
                            <p>{item.date}</p>
                          </div>
                          {item.authors ? <p>{item.authors}</p> : null}
                          {venue ? (
                            <p className="font-normal italic">{venue}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </PreviewSection>
              ) : null}

              {visibleCertifications.length > 0 ? (
                <PreviewSection
                  title={resume.sectionTitles.certifications}
                  order={sectionOrder.indexOf("certifications") + 1}
                >
                  <div className="grid gap-[7px]">
                    {visibleCertifications.map((item) => {
                      const verificationUrl = normalizeResumeLink(item.credentialUrl);
                      const dateLabel =
                        item.status === "inProgress" ? "Expected" : "Issued";
                      const metadata = [
                        item.expirationDate
                          ? `Expires: ${item.expirationDate}`
                          : "",
                        item.credentialId
                          ? `Credential ID: ${item.credentialId}`
                          : "",
                      ].filter(Boolean);

                      return (
                        <div key={item.id}>
                          <div className="grid grid-cols-[1fr_auto] gap-4 font-bold">
                            <p>
                              {item.name}
                              {item.status === "inProgress"
                                ? " (in progress)"
                                : ""}
                            </p>
                            <p>
                              {item.issueDate
                                ? `${dateLabel}: ${item.issueDate}`
                                : ""}
                            </p>
                          </div>
                          <p className="font-normal italic">{item.issuer}</p>
                          {metadata.length > 0 || verificationUrl ? (
                            <p className="text-[10.5px]">
                              {metadata.join(" · ")}
                              {metadata.length > 0 && verificationUrl ? " · " : ""}
                              {verificationUrl ? (
                                <ResumePreviewLink href={verificationUrl}>
                                  Verify credential
                                </ResumePreviewLink>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </PreviewSection>
              ) : null}

              {visibleAchievements.length > 0 ? (
                <PreviewSection
                  title={resume.sectionTitles.achievements}
                  order={sectionOrder.indexOf("achievements") + 1}
                >
                  <table className="w-full border-collapse text-center text-[11px] leading-tight">
                    <thead>
                      <tr>
                        <TableHead>Competition</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Competition</TableHead>
                        <TableHead>Position</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {pairRows(visibleAchievements).map(([left, right]) => (
                        <tr key={left.id}>
                          <TableCell>{left.competition}</TableCell>
                          <TableCell>{left.position}</TableCell>
                          <TableCell>{right?.competition ?? ""}</TableCell>
                          <TableCell>{right?.position ?? ""}</TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </PreviewSection>
              ) : null}

              {visibleActivities.length > 0 ? (
                <PreviewSection
                  title={resume.sectionTitles.activities}
                  order={sectionOrder.indexOf("activities") + 1}
                >
                  <div className="grid gap-[7px]">
                    {visibleActivities.map((item, index) => (
                      <div key={item.id}>
                        <div className="grid grid-cols-[1fr_auto] gap-4 font-bold">
                          <p>
                            {index + 1}. {item.role} -{" "}
                            <span className="font-normal italic">
                              {item.organization}
                            </span>
                          </p>
                          <p>{item.dates}</p>
                        </div>
                        <ul className="ml-[0.3in] mt-[4px] list-disc space-y-[1px]">
                          {item.bullets
                            .filter((bullet) => bullet.included && bullet.text)
                            .map((bullet) => (
                              <li key={bullet.id} className="pl-[0.02in]">
                                {bullet.text}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </PreviewSection>
              ) : null}

              {visibleSkills.length > 0 ? (
                <PreviewSection
                  title={resume.sectionTitles.skills}
                  order={sectionOrder.indexOf("skills") + 1}
                >
                  <div className="grid gap-[2px]">
                    {visibleSkills.map((item) => (
                      <div key={item.id}>
                        <h4 className="font-bold">{item.title}</h4>
                        <p>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </PreviewSection>
              ) : null}

              {visibleReferences.length > 0 ? (
                <PreviewSection
                  title={resume.sectionTitles.references}
                  order={sectionOrder.indexOf("references") + 1}
                >
                  <div className="grid grid-cols-2 border border-black text-[11px] leading-tight">
                    {visibleReferences.map((item) => (
                      <div key={item.id} className="border-r border-black p-[7px] last:border-r-0">
                        <h4 className="font-bold">{item.name}</h4>
                        <p className="font-bold">
                          {item.title}, {item.organization}
                        </p>
                        <p>
                          <ResumePreviewLink
                            href={contactUrl("mailto", item.email)}
                          >
                            {item.email}
                          </ResumePreviewLink>{" "}
                          |{" "}
                          <ResumePreviewLink href={contactUrl("tel", item.phone)}>
                            {item.phone}
                          </ResumePreviewLink>
                        </p>
                      </div>
                    ))}
                  </div>
                </PreviewSection>
              ) : null}

              {resume.customSections.map((section) => {
                const visibleEntries = section.entries.filter(
                  (item) => item.included,
                );

                if (visibleEntries.length === 0) {
                  return null;
                }

                return (
                  <PreviewSection
                    key={section.id}
                    title={section.title}
                    order={sectionOrder.indexOf(section.id) + 1}
                  >
                    <div className="grid gap-[7px]">
                      {visibleEntries.map((item) => {
                        const visibleBullets = item.bullets.filter(
                          (bullet) => bullet.included && bullet.text,
                        );
                        const linkLabel = item.link.trim();
                        const linkHref = normalizeResumeLink(linkLabel);

                        return (
                          <div key={item.id}>
                            <div className="grid grid-cols-[1fr_auto] gap-4 font-bold">
                              <p>
                                {item.heading}
                                {item.heading && item.subheading ? " - " : ""}
                                {item.subheading ? (
                                  <span className="font-normal italic">
                                    {item.subheading}
                                  </span>
                                ) : null}
                                {item.heading && !item.subheading && linkLabel
                                  ? " - "
                                  : ""}
                                {item.subheading && linkLabel ? " - " : ""}
                                {linkLabel ? (
                                  <span className="font-normal italic">
                                    <ResumePreviewLink href={linkHref}>
                                      {linkLabel}
                                    </ResumePreviewLink>
                                  </span>
                                ) : null}
                              </p>
                              <p>
                                {item.place ? (
                                  <span className="font-normal">
                                    {item.place}
                                  </span>
                                ) : null}
                                {item.place && item.dates ? " Â· " : ""}
                                {item.dates}
                              </p>
                            </div>
                            {item.useBullets ? (
                              visibleBullets.length > 0 ? (
                                <ul className="ml-[0.3in] mt-[4px] list-disc space-y-[1px]">
                                  {visibleBullets.map((bullet) => (
                                    <li key={bullet.id} className="pl-[0.02in]">
                                      {bullet.text}
                                    </li>
                                  ))}
                                </ul>
                              ) : null
                            ) : item.description ? (
                              <p className="mt-[4px] whitespace-pre-line">
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </PreviewSection>
                );
              })}
                </div>
              </>
            ) : null}
          </article>
          {resume.coverLetter.included ? (
            <CoverLetterPreview left="0" resume={resume} />
          ) : null}
          </div>
        </div>
      </section>
      ) : null}
    </main>
  );
}

function BulletEditor({
  bullet,
  onToggle,
  onChange,
  onRemove,
  dragGroup,
  onDragStart,
  onDragOverTarget,
  onDrop,
  dropIndicator,
}: {
  bullet: ResumeBullet;
  onToggle: () => void;
  onChange: (value: string) => void;
  onRemove: () => void;
  dragGroup: string;
  onDragStart: (group: string, id: string) => void;
  onDragOverTarget: (
    event: React.DragEvent<HTMLElement>,
    group: string,
    id: string,
  ) => void;
  onDrop: (group: string, id: string) => void;
  dropIndicator: DropIndicator | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const indicator =
    dropIndicator?.group === dragGroup && dropIndicator.id === bullet.id
      ? dropIndicator.position
      : null;

  useLayoutEffect(() => {
    autoResizeTextarea(textareaRef.current);
  }, [bullet.text]);

  return (
    <div
      className={cn(
        "relative grid grid-cols-[auto_auto_1fr_auto] gap-2 rounded-md",
        indicator === "before" &&
          "before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-0.5 before:bg-foreground",
        indicator === "after" &&
          "after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-0.5 after:bg-foreground",
      )}
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        onDragStart(dragGroup, bullet.id);
      }}
      onDragOver={(event) => onDragOverTarget(event, dragGroup, bullet.id)}
      onDrop={(event) => {
        event.stopPropagation();
        onDrop(dragGroup, bullet.id);
      }}
    >
      <GripVertical
        className="mt-2 size-4 cursor-grab text-muted-foreground"
        aria-hidden="true"
      />
      <div className="mt-2">
        <Toggle
          checked={bullet.included}
          label={bullet.included ? "Hide bullet" : "Show bullet"}
          onClick={onToggle}
        />
      </div>
      <textarea
        ref={textareaRef}
        value={bullet.text}
        rows={2}
        onChange={(event) => {
          autoResizeTextarea(event.currentTarget);
          onChange(event.target.value);
        }}
        className="resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label="Remove bullet"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function GridRowEditor({
  included,
  title,
  children,
  onToggle,
  onRemove,
  dragGroup,
  dragId,
  onDragStart,
  onDragOverTarget,
  onDrop,
  dropIndicator,
}: {
  included: boolean;
  title: string;
  children: React.ReactNode;
  onToggle: () => void;
  onRemove: () => void;
  dragGroup: string;
  dragId: string;
  onDragStart: (group: string, id: string) => void;
  onDragOverTarget: (
    event: React.DragEvent<HTMLElement>,
    group: string,
    id: string,
  ) => void;
  onDrop: (group: string, id: string) => void;
  dropIndicator: DropIndicator | null;
}) {
  const indicator =
    dropIndicator?.group === dragGroup && dropIndicator.id === dragId
      ? dropIndicator.position
      : null;

  return (
    <div
      className={cn(
        "relative grid gap-3 rounded-md border p-3",
        indicator === "before" &&
          "before:absolute before:-top-2 before:left-0 before:right-0 before:h-0.5 before:bg-foreground",
        indicator === "after" &&
          "after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-foreground",
      )}
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        onDragStart(dragGroup, dragId);
      }}
      onDragOver={(event) => onDragOverTarget(event, dragGroup, dragId)}
      onDrop={(event) => {
        event.stopPropagation();
        onDrop(dragGroup, dragId);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex min-w-0 items-center gap-2">
          <GripVertical
            className="size-4 cursor-grab text-muted-foreground"
            aria-hidden="true"
          />
          <Toggle
            checked={included}
            label={included ? "Hide item" : "Show item"}
            onClick={onToggle}
          />
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label="Remove item"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="border border-black px-2 py-[3px] font-bold">{children}</th>;
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="border border-black px-2 py-[3px]">{children}</td>;
}
