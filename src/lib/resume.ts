import { getCloudflareDb } from "@/lib/cloudflare";
import { migrateLegacyProfilePhoto } from "@/lib/profile-photo";
import {
  defaultResumeSectionOrder,
  defaultResumeSectionTitles,
  normalizeResumeCustomSections,
  normalizeResumeSectionOrder,
  normalizeResumeSectionTitles,
} from "@/lib/resume-schema";
import { nowDhakaIso } from "@/lib/time";

export {
  defaultResumeSectionOrder,
  defaultResumeSectionTitles,
  normalizeResumeCustomSections,
  normalizeResumeSectionOrder,
  normalizeResumeSectionTitles,
} from "@/lib/resume-schema";

export type ResumeBullet = {
  id: string;
  included: boolean;
  text: string;
};

export type ResumeWorkExperience = {
  id: string;
  included: boolean;
  role: string;
  company: string;
  place: string;
  dates: string;
  bullets: ResumeBullet[];
};

export type ResumeProject = {
  id: string;
  included: boolean;
  title: string;
  dates: string;
  bullets: ResumeBullet[];
};

export type ResumeCertificationStatus = "completed" | "inProgress";

export type ResumeCertification = {
  id: string;
  included: boolean;
  name: string;
  issuer: string;
  status: ResumeCertificationStatus;
  issueDate: string;
  expirationDate: string;
  credentialId: string;
  credentialUrl: string;
};

export type ResumePublicationStatus = "published" | "inPress" | "underReview";

export type ResumePublication = {
  id: string;
  included: boolean;
  title: string;
  authors: string;
  venue: string;
  status: ResumePublicationStatus;
  date: string;
  details: string;
  url: string;
};

export type ResumeEducation = {
  id: string;
  included: boolean;
  year: string;
  degree: string;
  concentration: string;
  institution: string;
  result: string;
};

export type ResumeAchievement = {
  id: string;
  included: boolean;
  competition: string;
  position: string;
};

export type ResumeActivity = {
  id: string;
  included: boolean;
  role: string;
  organization: string;
  dates: string;
  bullets: ResumeBullet[];
};

export type ResumeSectionKey =
  | "workExperience"
  | "education"
  | "publications"
  | "certifications"
  | "achievements"
  | "activities"
  | "skills"
  | "references";

export type ResumeCustomSectionId = `custom:${string}`;
export type ResumeSectionId = ResumeSectionKey | ResumeCustomSectionId;

export type ResumeCustomEntry = {
  id: string;
  included: boolean;
  heading: string;
  subheading: string;
  link: string;
  place: string;
  dates: string;
  useBullets: boolean;
  description: string;
  bullets: ResumeBullet[];
};

export type ResumeCustomSection = {
  id: ResumeCustomSectionId;
  title: string;
  entries: ResumeCustomEntry[];
};

export type ResumeSkillGroup = {
  id: string;
  included: boolean;
  title: string;
  value: string;
};

export type ResumeReference = {
  id: string;
  included: boolean;
  name: string;
  title: string;
  organization: string;
  email: string;
  phone: string;
};

export type ResumeCoverLetter = {
  included: boolean;
  date: string;
  recipientName: string;
  recipientTitle: string;
  company: string;
  address: string;
  salutation: string;
  body: string;
  justifyBody: boolean;
  closing: string;
};

export type ResumeContent = {
  contact: {
    name: string;
    phone: string;
    email: string;
    linkedin: string;
    website: string;
    photoUrl: string;
  };
  summary: {
    included: boolean;
    value: string;
  };
  workExperience: ResumeWorkExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  publications: ResumePublication[];
  certifications: ResumeCertification[];
  achievements: ResumeAchievement[];
  activities: ResumeActivity[];
  skills: ResumeSkillGroup[];
  references: ResumeReference[];
  coverLetter: ResumeCoverLetter;
  sectionTitles: ResumeSectionTitles;
  customSections: ResumeCustomSection[];
  sectionOrder: ResumeSectionId[];
};

export type ResumeSectionTitles = Record<ResumeSectionKey, string>;

export const defaultResumeContent: ResumeContent = {
  contact: {
    name: "",
    phone: "",
    email: "",
    linkedin: "",
    website: "",
    photoUrl: "",
  },
  summary: {
    included: true,
    value: "",
  },
  workExperience: [],
  projects: [],
  education: [],
  publications: [],
  certifications: [],
  achievements: [],
  activities: [],
  skills: [],
  references: [],
  sectionTitles: defaultResumeSectionTitles,
  customSections: [],
  coverLetter: {
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
  sectionOrder: defaultResumeSectionOrder,
};

const DEFAULT_RESUME_ID = "default";
const PROFILE_RESUME_PREFIX = "profile";

type ResumeProfileRow = {
  content_json: string;
};

function isResumeContent(value: unknown): value is ResumeContent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ResumeContent>;
  return (
    Boolean(candidate.contact) &&
    Boolean(candidate.summary) &&
    Array.isArray(candidate.workExperience) &&
    (candidate.projects === undefined || Array.isArray(candidate.projects)) &&
    Array.isArray(candidate.education) &&
    (candidate.publications === undefined ||
      Array.isArray(candidate.publications)) &&
    (candidate.certifications === undefined ||
      Array.isArray(candidate.certifications)) &&
    Array.isArray(candidate.achievements) &&
    Array.isArray(candidate.activities) &&
    Array.isArray(candidate.skills) &&
    Array.isArray(candidate.references) &&
    (candidate.sectionTitles === undefined ||
      (typeof candidate.sectionTitles === "object" &&
        candidate.sectionTitles !== null)) &&
    (candidate.customSections === undefined ||
      Array.isArray(candidate.customSections))
  );
}

function scopedResumeId(userId: string) {
  return `${PROFILE_RESUME_PREFIX}:${userId || DEFAULT_RESUME_ID}`;
}

async function readResumeContent(id: string): Promise<ResumeContent | null> {
  const row = await getCloudflareDb()
    .prepare(`SELECT content_json FROM resume_profiles WHERE id = ?`)
    .bind(id)
    .first<ResumeProfileRow>();

  if (!row) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.content_json) as unknown;

    if (isResumeContent(parsed)) {
      const customSections = normalizeResumeCustomSections(
        parsed.customSections,
      );
      const normalized = { ...parsed } as ResumeContent & {
        layout?: unknown;
      };
      delete normalized.layout;

      return {
        ...normalized,
        contact: {
          ...parsed.contact,
          website:
            parsed.contact.website || defaultResumeContent.contact.website,
          photoUrl:
            parsed.contact.photoUrl || defaultResumeContent.contact.photoUrl,
        },
        workExperience: parsed.workExperience.map((item) => ({
          ...item,
          place: item.place ?? "",
        })),
        projects: parsed.projects ?? defaultResumeContent.projects,
        sectionTitles: normalizeResumeSectionTitles(parsed.sectionTitles),
        customSections,
        publications: (parsed.publications ?? []).map((item) => ({
          ...item,
          title: item.title ?? "",
          authors: item.authors ?? "",
          venue: item.venue ?? "",
          status:
            item.status === "inPress" || item.status === "underReview"
              ? item.status
              : "published",
          date: item.date ?? "",
          details: item.details ?? "",
          url: item.url ?? "",
        })),
        certifications: (parsed.certifications ?? []).map((item) => ({
          ...item,
          name: item.name ?? "",
          issuer: item.issuer ?? "",
          status: item.status === "inProgress" ? "inProgress" : "completed",
          issueDate: item.issueDate ?? "",
          expirationDate: item.expirationDate ?? "",
          credentialId: item.credentialId ?? "",
          credentialUrl: item.credentialUrl ?? "",
        })),
        activities: parsed.activities.map((item) => ({
          ...item,
          bullets: item.bullets ?? [],
        })),
        coverLetter: {
          ...defaultResumeContent.coverLetter,
          ...(parsed.coverLetter ?? {}),
          justifyBody: parsed.coverLetter?.justifyBody === true,
        },
        sectionOrder: normalizeResumeSectionOrder(
          parsed.sectionOrder,
          customSections.map((section) => section.id),
        ),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function getResumeContent(userId: string): Promise<ResumeContent> {
  const profileId = scopedResumeId(userId);
  const legacyId = userId || DEFAULT_RESUME_ID;
  const profile = await readResumeContent(profileId);

  const legacy = profile ? null : await readResumeContent(legacyId);
  const initialContent = profile ?? legacy ?? defaultResumeContent;
  const photoUrl = await migrateLegacyProfilePhoto(
    userId,
    initialContent.contact.photoUrl,
  );

  if (!profile || initialContent.contact.photoUrl) {
    await saveResumeContent(userId, initialContent);
  }

  return {
    ...initialContent,
    contact: {
      ...initialContent.contact,
      photoUrl,
    },
  };
}

export async function saveResumeContent(
  userId: string,
  content: ResumeContent,
) {
  const localContent: ResumeContent & { layout?: unknown } = {
    ...content,
    contact: {
      ...content.contact,
      photoUrl: "",
    },
  };
  delete localContent.layout;

  const db = getCloudflareDb();
  const updatedAt = nowDhakaIso();

  await db
    .prepare(
      `
        INSERT INTO resume_profiles (id, content_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          content_json = excluded.content_json,
          updated_at = excluded.updated_at
      `,
    )
    .bind(scopedResumeId(userId), JSON.stringify(localContent), updatedAt)
    .run();
}
