import type {
  ResumeBullet,
  ResumeContent,
  ResumeCustomEntry,
  ResumeCustomSection,
  ResumeCustomSectionId,
  ResumeSectionId,
  ResumeSectionKey,
  ResumeSectionTitles,
} from "@/lib/resume";

export const defaultResumeSectionOrder: ResumeSectionKey[] = [
  "workExperience",
  "education",
  "publications",
  "certifications",
  "achievements",
  "activities",
  "skills",
  "references",
];

export const defaultResumeSectionTitles: ResumeSectionTitles = {
  workExperience: "Work Experience",
  education: "Education",
  publications: "Publications",
  certifications: "Certifications",
  achievements: "Achievements",
  activities: "Extracurricular Activities",
  skills: "Skills",
  references: "References",
};

export function isResumeSectionKey(value: string): value is ResumeSectionKey {
  return defaultResumeSectionOrder.includes(value as ResumeSectionKey);
}

export function normalizeResumeSectionTitles(value: unknown): ResumeSectionTitles {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<Record<ResumeSectionKey, unknown>>)
      : {};
  const titles = { ...defaultResumeSectionTitles };

  defaultResumeSectionOrder.forEach((section) => {
    if (typeof candidate[section] === "string") {
      titles[section] = candidate[section] as string;
    }
  });

  return titles;
}

function normalizeResumeBullet(value: unknown): ResumeBullet | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ResumeBullet>;

  if (typeof candidate.id !== "string") {
    return null;
  }

  return {
    id: candidate.id,
    included: candidate.included !== false,
    text: typeof candidate.text === "string" ? candidate.text : "",
  };
}

export function normalizeResumeCustomSections(
  value: unknown,
): ResumeCustomSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ResumeCustomSection | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<ResumeCustomSection>;

      if (
        typeof candidate.id !== "string" ||
        !candidate.id.startsWith("custom:")
      ) {
        return null;
      }

      const entries = Array.isArray(candidate.entries)
        ? candidate.entries
            .map((entry): ResumeCustomEntry | null => {
              if (!entry || typeof entry !== "object") {
                return null;
              }

              const current = entry as Partial<ResumeCustomEntry>;

              if (typeof current.id !== "string") {
                return null;
              }

              return {
                id: current.id,
                included: current.included !== false,
                heading:
                  typeof current.heading === "string" ? current.heading : "",
                subheading:
                  typeof current.subheading === "string"
                    ? current.subheading
                    : "",
                place: typeof current.place === "string" ? current.place : "",
                dates: typeof current.dates === "string" ? current.dates : "",
                useBullets: current.useBullets === true,
                description:
                  typeof current.description === "string"
                    ? current.description
                    : "",
                bullets: Array.isArray(current.bullets)
                  ? current.bullets
                      .map(normalizeResumeBullet)
                      .filter((bullet): bullet is ResumeBullet => Boolean(bullet))
                  : [],
              };
            })
            .filter((entry): entry is ResumeCustomEntry => Boolean(entry))
        : [];

      return {
        id: candidate.id as ResumeCustomSectionId,
        title:
          typeof candidate.title === "string" ? candidate.title : "untitled",
        entries,
      };
    })
    .filter((section): section is ResumeCustomSection => Boolean(section));
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasBullets(value: ResumeBullet[] | undefined) {
  return Boolean(
    value?.some((bullet) => bullet.included && hasText(bullet.text)),
  );
}

export function hasResumeContent(
  resume: ResumeContent,
  photoUrl = resume.contact.photoUrl,
) {
  const contact = resume.contact;

  if (
    [
      contact.name,
      contact.phone,
      contact.email,
      contact.linkedin,
      contact.website,
      photoUrl,
    ].some(hasText)
  ) {
    return true;
  }

  if (resume.summary.included && hasText(resume.summary.value)) {
    return true;
  }

  if (
    resume.workExperience.some(
      (item) =>
        item.included &&
        ([item.role, item.company, item.place, item.dates].some(hasText) ||
          hasBullets(item.bullets)),
    )
  ) {
    return true;
  }

  if (
    resume.education.some(
      (item) =>
        item.included &&
        [
          item.year,
          item.degree,
          item.concentration,
          item.institution,
          item.result,
        ].some(hasText),
    )
  ) {
    return true;
  }

  if (
    resume.publications.some(
      (item) =>
        item.included &&
        [
          item.title,
          item.authors,
          item.venue,
          item.date,
          item.details,
          item.url,
        ].some(hasText),
    )
  ) {
    return true;
  }

  if (
    resume.certifications.some(
      (item) =>
        item.included &&
        [
          item.name,
          item.issuer,
          item.issueDate,
          item.expirationDate,
          item.credentialId,
          item.credentialUrl,
        ].some(hasText),
    )
  ) {
    return true;
  }

  if (
    resume.achievements.some(
      (item) =>
        item.included && [item.competition, item.position].some(hasText),
    )
  ) {
    return true;
  }

  if (
    resume.activities.some(
      (item) =>
        item.included &&
        ([item.role, item.organization, item.dates].some(hasText) ||
          hasBullets(item.bullets)),
    )
  ) {
    return true;
  }

  if (
    resume.skills.some(
      (item) => item.included && [item.title, item.value].some(hasText),
    )
  ) {
    return true;
  }

  if (
    resume.references.some(
      (item) =>
        item.included &&
        [
          item.name,
          item.title,
          item.organization,
          item.email,
          item.phone,
        ].some(hasText),
    )
  ) {
    return true;
  }

  return resume.customSections.some((section) =>
    section.entries.some(
      (item) =>
        item.included &&
        ([item.heading, item.subheading, item.place, item.dates, item.description].some(
          hasText,
        ) ||
          hasBullets(item.bullets)),
    ),
  );
}

export function normalizeResumeSectionOrder(
  order: unknown,
  customSectionIds: ResumeCustomSectionId[] = [],
): ResumeSectionId[] {
  const validSections = new Set<string>([
    ...defaultResumeSectionOrder,
    ...customSectionIds,
  ]);
  const current = Array.isArray(order)
    ? [
        ...new Set(
          order.filter(
            (section): section is ResumeSectionId =>
              typeof section === "string" && validSections.has(section),
          ),
        ),
      ]
    : [];
  const next: ResumeSectionId[] = [...current];

  if (next.length === 0) {
    return [...defaultResumeSectionOrder, ...customSectionIds];
  }

  defaultResumeSectionOrder.forEach((section, index) => {
    if (next.includes(section)) {
      return;
    }

    let previousSection: ResumeSectionId | undefined;

    for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
      const candidate = defaultResumeSectionOrder[previousIndex];

      if (next.includes(candidate)) {
        previousSection = candidate;
        break;
      }
    }

    const previousIndex = previousSection ? next.indexOf(previousSection) : -1;
    next.splice(previousIndex + 1, 0, section);
  });

  customSectionIds.forEach((section) => {
    if (!next.includes(section)) {
      next.push(section);
    }
  });

  return next;
}
