"use client";

import {
  Check,
  Download,
  FileText,
  GripVertical,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

import { saveResumeAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import type {
  ResumeAchievement,
  ResumeActivity,
  ResumeBullet,
  ResumeContent,
  ResumeEducation,
  ResumeProject,
  ResumeReference,
  ResumeSectionKey,
  ResumeSkillGroup,
  ResumeWorkExperience,
} from "@/lib/resume";
import { cn } from "@/lib/utils";

type ResumeBuilderProps = {
  initialResume: ResumeContent;
  subtitle?: string;
  title?: string;
  showPreview?: boolean;
};

type SaveState = "saved" | "saving" | "unsaved";
type DragTarget = {
  group: string;
  id: string;
};
type DropIndicator = DragTarget & {
  position: "before" | "after";
};

const sectionLabels: Record<ResumeSectionKey, string> = {
  workExperience: "Work Experience",
  projects: "Projects",
  education: "Education",
  achievements: "Achievements",
  activities: "Extracurricular Activities",
  skills: "Skills",
  references: "References",
};

const resumeSectionOrder: ResumeSectionKey[] = [
  "workExperience",
  "projects",
  "education",
  "achievements",
  "activities",
  "skills",
  "references",
];

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function findPreviousSection(
  order: ResumeSectionKey[],
  candidateSections: ResumeSectionKey[],
) {
  for (let index = candidateSections.length - 1; index >= 0; index -= 1) {
    const candidate = candidateSections[index];

    if (order.includes(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function normalizeSectionOrder(order: ResumeSectionKey[] | undefined) {
  const current = Array.isArray(order) ? order : [];
  const next = current.filter((section): section is ResumeSectionKey =>
    resumeSectionOrder.includes(section as ResumeSectionKey),
  );

  if (next.length === 0) {
    return [...resumeSectionOrder];
  }

  resumeSectionOrder.forEach((section, index) => {
    if (next.includes(section)) {
      return;
    }

    const previousSection = findPreviousSection(
      next,
      resumeSectionOrder.slice(0, index),
    );
    const previousIndex = previousSection ? next.indexOf(previousSection) : -1;
    next.splice(previousIndex + 1, 0, section);
  });

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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
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
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
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

function EditorSection({
  title,
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
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
      <h3 className="border-b-[2px] border-black pb-[2px] text-[13px] font-bold uppercase leading-none">
        {title}
      </h3>
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

function CoverLetterPreview({
  left,
  resume,
}: {
  left: string;
  resume: ResumeContent;
}) {
  const coverLetter = resume.coverLetter;
  const recipientLines = [
    coverLetter.recipientName,
    coverLetter.recipientTitle,
    coverLetter.company,
    ...coverLetter.address.split("\n"),
  ].filter((line) => line.trim());

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
          {[resume.contact.phone, resume.contact.email, resume.contact.linkedin]
            .filter(Boolean)
            .join(" | ")}
        </p>
      </header>

      <div className="mt-[0.42in]">
        {coverLetter.date ? <p>{coverLetter.date}</p> : null}

        {recipientLines.length > 0 ? (
          <div className="mt-[0.28in]">
            {recipientLines.map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>
        ) : null}

        <p className="mt-[0.28in]">
          {coverLetter.salutation || "Dear Hiring Manager,"}
        </p>

        <div className="mt-[0.22in] grid gap-[0.18in]">
          {splitParagraphs(coverLetter.body).map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-[0.32in]">
          <p>{coverLetter.closing || "Sincerely,"}</p>
          <p className="mt-[0.34in] font-semibold">{resume.contact.name}</p>
        </div>
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
  const [resume, setResume] = useState<ResumeContent>({
    ...initialResume,
    contact: {
      ...initialResume.contact,
      website: initialResume.contact.website ?? "",
    },
    projects: initialResume.projects ?? [],
    coverLetter: initialResume.coverLetter ?? {
      included: false,
      date: "",
      recipientName: "",
      recipientTitle: "",
      company: "",
      address: "",
      salutation: "Dear Hiring Manager,",
      body: "",
      closing: "Sincerely,",
    },
    sectionOrder: normalizeSectionOrder(initialResume.sectionOrder),
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [downloadState, setDownloadState] = useState<SaveState>("saved");
  const [downloadError, setDownloadError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [previewZoom, setPreviewZoom] = useState(0.78);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [resumePageCount, setResumePageCount] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [isPending, startTransition] = useTransition();
  const didMount = useRef(false);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const resumePreviewRef = useRef<HTMLElement>(null);
  const panStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    setSaveState("unsaved");
    const timeout = window.setTimeout(() => {
      setSaveState("saving");
      startTransition(async () => {
        await saveResumeAction(resume);
        setSaveState("saved");
      });
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [resume]);

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

    if (key === "photoUrl") {
      window.dispatchEvent(
        new CustomEvent("profile-photo-change", { detail: { photoUrl: value } }),
      );
    }
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

  const uploadContactPhoto = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1_000_000
    ) {
      setPhotoError("Choose a JPEG, PNG, or WebP image no larger than 1 MB.");
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateContact("photoUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeContactPhoto = () => {
    setPhotoError("");
    updateContact("photoUrl", "");

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

  const updateProject = (
    id: string,
    updater: (item: ResumeProject) => ResumeProject,
  ) => {
    setResume((current) => ({
      ...current,
      projects: current.projects.map((item) =>
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

  const reorderSection = (
    fromId: string,
    toId: string,
    position: "before" | "after",
  ) => {
    setResume((current) => ({
      ...current,
      sectionOrder: reorderById(
        normalizeSectionOrder(current.sectionOrder).map((id) => ({ id })),
        fromId,
        toId,
        position,
      ).map((item) => item.id as ResumeSectionKey),
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
        case "projects":
          return {
            ...current,
            projects: reorderById(current.projects, fromId, toId, position),
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

  const reorderProjectBullet = (
    projectId: string,
    fromBulletId: string,
    toBulletId: string,
    position: "before" | "after",
  ) => {
    updateProject(projectId, (project) => ({
      ...project,
      bullets: reorderById(project.bullets, fromBulletId, toBulletId, position),
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
    } else if (group.startsWith("projectBullets:")) {
      reorderProjectBullet(
        group.replace("projectBullets:", ""),
        dragTarget.id,
        id,
        position,
      );
    } else if (group.startsWith("activityBullets:")) {
      reorderActivityBullet(
        group.replace("activityBullets:", ""),
        dragTarget.id,
        id,
        position,
      );
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

  const handlePreviewWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    const amount = Math.min(0.12, Math.abs(event.deltaY) / 900);
    setPreviewZoom((current) =>
      Math.min(
        2,
        Math.max(0.45, current + direction * Math.max(0.025, amount)),
      ),
    );
  };

  const handlePreviewPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
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
    if (isPanning) {
      event.currentTarget.releasePointerCapture(event.pointerId);
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
      const documents: Array<Promise<Blob>> = [requestPdf("resume")];

      if (resume.coverLetter.included) {
        documents.push(requestPdf("coverLetter"));
      }

      const [resumePdf, coverLetterPdf] = await Promise.all(documents);
      saveDownloadedBlob(resumePdf, `${safeName}-resume.pdf`);

      if (coverLetterPdf) {
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
  const visibleProjects = resume.projects.filter((item) => item.included);
  const visibleEducation = resume.education.filter((item) => item.included);
  const visibleAchievements = resume.achievements.filter((item) => item.included);
  const visibleActivities = resume.activities.filter((item) => item.included);
  const visibleSkills = resume.skills.filter((item) => item.included);
  const visibleReferences = resume.references.filter((item) => item.included);
  const sectionOrder = normalizeSectionOrder(resume.sectionOrder);
  const totalPreviewPages =
    resumePageCount + (resume.coverLetter.included ? 1 : 0);

  return (
    <main
      className={cn(
        "grid bg-muted",
        showPreview
          ? "h-[calc(100vh-61px)] overflow-hidden lg:grid-cols-[minmax(720px,48vw)_minmax(0,1fr)]"
          : "mx-auto min-h-[calc(100vh-61px)] w-full max-w-3xl border-l lg:grid-cols-1",
      )}
    >
      <section
        className={cn(
          "flex min-h-0 flex-col border-r bg-background",
          showPreview && "overflow-hidden",
        )}
      >
        {showPreview ? (
          <div className="z-[1] flex h-16 shrink-0 items-center justify-between border-b bg-background px-5">
            <div>
              <h1 className="text-base font-semibold">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {saveState === "saving" || isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5 text-primary" />
                )}
                <span>
                  {saveState === "saved"
                    ? "Saved"
                    : saveState === "saving"
                      ? "Saving"
                      : "Unsaved"}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div
          ref={editorScrollRef}
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-6 px-5 py-5",
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
                      className="h-[1.55in] w-[1.28in] overflow-hidden border bg-muted"
                      aria-hidden="true"
                    >
                      {resume.contact.photoUrl ? (
                        <div
                          className="size-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url("${resume.contact.photoUrl}")`,
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
                          onClick={() => photoInputRef.current?.click()}
                        >
                          Choose photo
                        </Button>
                        {resume.contact.photoUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeContactPhoto}
                            aria-label="Remove photo"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload a portrait image. It is saved into this resume and
                        used in the preview and PDF.
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

          <EditorSection
            title="Work Experience"
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
            title="Projects"
            dragGroup="sections"
            dragId="projects"
            order={sectionOrder.indexOf("projects") + 1}
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
                    projects: [
                      ...current.projects,
                      {
                        id: newId("project"),
                        included: true,
                        title: "",
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
            {resume.projects.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "relative grid gap-3 rounded-md border p-3",
                  dropIndicator?.group === "projects" &&
                    dropIndicator.id === item.id &&
                    dropIndicator.position === "before" &&
                    "before:absolute before:-top-2 before:left-0 before:right-0 before:h-0.5 before:bg-foreground",
                  dropIndicator?.group === "projects" &&
                    dropIndicator.id === item.id &&
                    dropIndicator.position === "after" &&
                    "after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-foreground",
                )}
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  handleDragStart("projects", item.id);
                }}
                onDragOver={(event) =>
                  handleDragOverTarget(event, "projects", item.id)
                }
                onDrop={(event) => {
                  event.stopPropagation();
                  handleDrop("projects", item.id);
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
                      label={item.included ? "Hide project" : "Show project"}
                      onClick={() =>
                        updateProject(item.id, (project) => ({
                          ...project,
                          included: !project.included,
                        }))
                      }
                    />
                    {item.title}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setResume((current) => ({
                        ...current,
                        projects: current.projects.filter(
                          (project) => project.id !== item.id,
                        ),
                      }))
                    }
                    aria-label="Remove project"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Project"
                    value={item.title}
                    onChange={(value) =>
                      updateProject(item.id, (project) => ({
                        ...project,
                        title: value,
                      }))
                    }
                  />
                  <Field
                    label="Dates"
                    value={item.dates}
                    onChange={(value) =>
                      updateProject(item.id, (project) => ({
                        ...project,
                        dates: value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  {item.bullets.map((bullet) => (
                    <BulletEditor
                      key={bullet.id}
                      bullet={bullet}
                      onToggle={() =>
                        updateProject(item.id, (project) => ({
                          ...project,
                          bullets: project.bullets.map((currentBullet) =>
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
                        updateProject(item.id, (project) => ({
                          ...project,
                          bullets: project.bullets.map((currentBullet) =>
                            currentBullet.id === bullet.id
                              ? { ...currentBullet, text: value }
                              : currentBullet,
                          ),
                        }))
                      }
                      onRemove={() =>
                        updateProject(item.id, (project) => ({
                          ...project,
                          bullets: project.bullets.filter(
                            (currentBullet) => currentBullet.id !== bullet.id,
                          ),
                        }))
                      }
                      dragGroup={`projectBullets:${item.id}`}
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
                      updateProject(item.id, (project) => ({
                        ...project,
                        bullets: [
                          ...project.bullets,
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
            title="Education"
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
            title="Achievements"
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
            title="Extracurricular Activities"
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
            title="Skills"
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
            title="References"
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

          <EditorSection
            title="Cover Letter"
            order={resumeSectionOrder.length + 1}
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {resume.coverLetter.included ? "Included" : "Not included"}
                </span>
                <Toggle
                  checked={resume.coverLetter.included}
                  label={
                    resume.coverLetter.included
                      ? "Remove cover letter"
                      : "Add cover letter"
                  }
                  onClick={() => {
                    const included = !resume.coverLetter.included;
                    updateCoverLetter("included", included);
                    setPreviewPan({ x: 0, y: 0 });
                  }}
                />
              </div>
            }
          >
            <div className="grid gap-4 rounded-lg border bg-muted/25 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Separate, one-page cover letter
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    When included, it appears after the resume in this preview
                    and downloads as its own PDF.
                  </p>
                </div>
              </div>

              {resume.coverLetter.included ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Date"
                    value={resume.coverLetter.date}
                    onChange={(value) => updateCoverLetter("date", value)}
                  />
                  <Field
                    label="Recipient name"
                    value={resume.coverLetter.recipientName}
                    onChange={(value) =>
                      updateCoverLetter("recipientName", value)
                    }
                  />
                  <Field
                    label="Recipient title"
                    value={resume.coverLetter.recipientTitle}
                    onChange={(value) =>
                      updateCoverLetter("recipientTitle", value)
                    }
                  />
                  <Field
                    label="Company"
                    value={resume.coverLetter.company}
                    onChange={(value) => updateCoverLetter("company", value)}
                  />
                  <div className="sm:col-span-2">
                    <TextArea
                      label="Company address"
                      rows={2}
                      value={resume.coverLetter.address}
                      onChange={(value) => updateCoverLetter("address", value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Salutation"
                      value={resume.coverLetter.salutation}
                      onChange={(value) =>
                        updateCoverLetter("salutation", value)
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextArea
                      label="Letter body"
                      rows={10}
                      value={resume.coverLetter.body}
                      onChange={(value) => updateCoverLetter("body", value)}
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      Separate paragraphs with a blank line.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Closing"
                      value={resume.coverLetter.closing}
                      onChange={(value) =>
                        updateCoverLetter("closing", value)
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </EditorSection>
        </div>
      </section>

      {showPreview ? (
      <section className="flex min-h-0 flex-col overflow-hidden bg-muted/40">
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background px-5">
          <div className="grid gap-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Document preview</span>
            <span>
              {resume.coverLetter.included
                ? `Cover letter - 1 page | Resume - ${resumePageCount} ${
                    resumePageCount === 1 ? "page" : "pages"
                  }`
                : `Resume - ${resumePageCount} ${
                    resumePageCount === 1 ? "page" : "pages"
                  }`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-9 p-0"
              aria-label="Zoom out"
              onClick={() =>
                setPreviewZoom((current) => Math.max(0.45, current - 0.08))
              }
            >
              <Minus className="size-4" />
            </Button>
            <input
              aria-label="Preview zoom"
              type="range"
              min="45"
              max="200"
              value={Math.round(previewZoom * 100)}
              onChange={(event) =>
                setPreviewZoom(Number(event.target.value) / 100)
              }
              className="w-28"
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
            <span className="w-10 text-right text-xs text-muted-foreground">
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
              {resume.coverLetter.included ? "2 PDFs" : "PDF"}
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
            "cursor-grab",
            isPanning && "cursor-grabbing",
          )}
          onWheel={handlePreviewWheel}
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
            <header className="grid grid-cols-[1fr_1.28in] gap-[0.25in]">
              <div>
                <h2 className="text-[18px] font-bold uppercase leading-tight">
                  {resume.contact.name}
                </h2>
                <p className="mt-[6px] text-[11.5px] leading-tight">
                  Phone:{" "}
                  <span className="text-blue-700 underline">
                    {resume.contact.phone}
                  </span>{" "}
                  | Email:{" "}
                  <span className="text-blue-700 underline">
                    {resume.contact.email}
                  </span>{" "}
                  | LinkedIn:{" "}
                  <span className="text-blue-700 underline">
                    {resume.contact.linkedin}
                  </span>
                  {resume.contact.website ? (
                    <>
                      {" "}
                      | Website:{" "}
                      <span className="text-blue-700 underline">
                        {resume.contact.website}
                      </span>
                    </>
                  ) : null}
                </p>
                {resume.summary.included ? (
                  <p className="mt-[15px] max-w-[6.35in] text-[11.5px] leading-[1.18]">
                    {resume.summary.value}
                  </p>
                ) : null}
              </div>
              <div className="h-[1.55in] w-[1.28in] border border-black">
                {resume.contact.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resume.contact.photoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-[10px] text-neutral-500">
                    Photo
                  </div>
                )}
              </div>
            </header>

            <div className="mt-[12px] grid gap-[9px] text-[11.5px] leading-[1.18]">
              {visibleWork.length > 0 ? (
                <PreviewSection
                  title="Work Experience"
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

              {visibleProjects.length > 0 ? (
                <PreviewSection
                  title="Projects"
                  order={sectionOrder.indexOf("projects") + 1}
                >
                  <div className="grid gap-[7px]">
                    {visibleProjects.map((item, index) => (
                      <div key={item.id}>
                        <div className="grid grid-cols-[1fr_auto] gap-4 font-bold">
                          <p>
                            {index + 1}. {item.title}
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

              {visibleEducation.length > 0 ? (
                <PreviewSection
                  title="Education"
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

              {visibleAchievements.length > 0 ? (
                <PreviewSection
                  title="Achievements"
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
                  title="Extracurricular Activities"
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
                  title="Skills"
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
                  title="References"
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
                          <span className="text-blue-700 underline">
                            {item.email}
                          </span>{" "}
                          |{" "}
                          <span className="text-blue-700 underline">
                            {item.phone}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </PreviewSection>
              ) : null}
            </div>
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
  const indicator =
    dropIndicator?.group === dragGroup && dropIndicator.id === bullet.id
      ? dropIndicator.position
      : null;

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
        value={bullet.text}
        rows={2}
        onChange={(event) => onChange(event.target.value)}
        className="resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
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
