import { getCloudflareDb } from "@/lib/cloudflare";
import { migrateLegacyProfilePhoto } from "@/lib/profile-photo";
import { nowDhakaIso } from "@/lib/time";

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
  achievements: ResumeAchievement[];
  activities: ResumeActivity[];
  skills: ResumeSkillGroup[];
  references: ResumeReference[];
  coverLetter: ResumeCoverLetter;
  sectionOrder: ResumeSectionKey[];
};

const DEFAULT_RESUME_ID = "default";
const PROFILE_RESUME_PREFIX = "profile";

export type ResumeSectionKey =
  | "workExperience"
  | "projects"
  | "education"
  | "achievements"
  | "activities"
  | "skills"
  | "references";

export const defaultResumeSectionOrder: ResumeSectionKey[] = [
  "workExperience",
  "projects",
  "education",
  "achievements",
  "activities",
  "skills",
  "references",
];

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
  achievements: [],
  activities: [],
  skills: [],
  references: [],
  coverLetter: {
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
  sectionOrder: defaultResumeSectionOrder,
};

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
    Array.isArray(candidate.achievements) &&
    Array.isArray(candidate.activities) &&
    Array.isArray(candidate.skills) &&
    Array.isArray(candidate.references)
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
      const existingSectionOrder = Array.isArray(parsed.sectionOrder)
        ? parsed.sectionOrder.filter((section): section is ResumeSectionKey =>
            defaultResumeSectionOrder.includes(section as ResumeSectionKey),
          )
        : [];
      const sectionOrder =
        existingSectionOrder.length > 0
          ? [...existingSectionOrder]
          : [...defaultResumeSectionOrder];

      defaultResumeSectionOrder.forEach((section, index) => {
        if (sectionOrder.includes(section)) {
          return;
        }

        const previousSection = findPreviousSection(
          sectionOrder,
          defaultResumeSectionOrder.slice(0, index),
        );
        const previousIndex = previousSection
          ? sectionOrder.indexOf(previousSection)
          : -1;

        sectionOrder.splice(previousIndex + 1, 0, section);
      });

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
        activities: parsed.activities.map((item) => ({
          ...item,
          bullets: item.bullets ?? [],
        })),
        coverLetter: {
          ...defaultResumeContent.coverLetter,
          ...(parsed.coverLetter ?? {}),
        },
        sectionOrder,
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
