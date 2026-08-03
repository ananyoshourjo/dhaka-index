import { getCloudflareDb } from "@/app/lib/cloudflare";
import { statement } from "@/app/lib/cloud-db";
import {
  getAdminProfilePhoto,
  getAdminProfilePhotoUrl,
} from "@/app/lib/profile-photo";

export type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: number;
  image: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  savedJobs: number;
  archivedJobs: number;
};

type RegisteredUserRow = Omit<RegisteredUser, "avatarUrl"> & {
  profileContentJson: string | null;
  profilePhotoUpdatedAt: string | null;
};

function readProfilePhotoUrl(contentJson: string | null) {
  if (!contentJson) {
    return "";
  }

  try {
    const parsed = JSON.parse(contentJson) as {
      contact?: { photoUrl?: unknown };
    };

    return typeof parsed.contact?.photoUrl === "string"
      ? parsed.contact.photoUrl
      : "";
  } catch {
    return "";
  }
}

export async function getUserAvatarUrl(
  userId: string,
  fallback: string | null,
) {
  const [profile, profilePhoto] = await Promise.all([
    statement(
      `
          SELECT content_json AS contentJson
          FROM resume_profiles
          WHERE id = ?
      `,
      [`profile:${userId}`],
    ).first<{ contentJson: string | null }>(),
    getAdminProfilePhoto(userId),
  ]);

  if (profilePhoto?.updatedAt) {
    return getAdminProfilePhotoUrl(userId, profilePhoto.updatedAt);
  }

  return readProfilePhotoUrl(profile?.contentJson ?? null) || fallback;
}

export async function getRegisteredUsers() {
  const result = await statement(
    `
        SELECT
          "user"."id",
          "user"."name",
          "user"."email",
          "user"."emailVerified",
          "user"."image",
          profile.content_json AS profileContentJson,
          MAX(profile_photo.updated_at) AS profilePhotoUpdatedAt,
          "user"."createdAt",
          "user"."updatedAt",
          COUNT(DISTINCT "session"."id") AS sessionCount,
          COUNT(DISTINCT bookmarked_job.id) AS savedJobs,
          COUNT(DISTINCT archived_job.id) AS archivedJobs
        FROM "user"
        LEFT JOIN "session"
          ON "session"."userId" = "user"."id"
        LEFT JOIN resume_profiles AS profile
          ON profile.id = 'profile:' || "user"."id"
        LEFT JOIN profile_photos AS profile_photo
          ON profile_photo.user_id = "user"."id"
        LEFT JOIN job_user_state AS bookmarked
          ON bookmarked.user_id = "user"."id"
          AND bookmarked.bookmarked_at IS NOT NULL
        LEFT JOIN jobs AS bookmarked_job
          ON bookmarked_job.id = bookmarked.job_id
          AND bookmarked_job.deleted_at IS NULL
        LEFT JOIN job_user_state AS archived
          ON archived.user_id = "user"."id"
          AND archived.archived_at IS NOT NULL
        LEFT JOIN jobs AS archived_job
          ON archived_job.id = archived.job_id
          AND archived_job.deleted_at IS NULL
        GROUP BY "user"."id"
        ORDER BY "user"."createdAt" DESC
    `,
  ).all<RegisteredUserRow>();

  return result.results.map(
    ({ profileContentJson, profilePhotoUpdatedAt, ...user }) => {
      const profilePhotoUrl = profilePhotoUpdatedAt
        ? getAdminProfilePhotoUrl(user.id, profilePhotoUpdatedAt)
        : readProfilePhotoUrl(profileContentJson);

      return {
        ...user,
        avatarUrl: profilePhotoUrl || user.image,
      };
    },
  );
}

export async function deleteRegisteredUser(userId: string) {
  const db = getCloudflareDb();
  const results = await db.batch([
    db
      .prepare(`DELETE FROM job_user_state WHERE user_id = ?`)
      .bind(userId),
    db
      .prepare(`DELETE FROM resume_profiles WHERE id = ?`)
      .bind(`profile:${userId}`),
    db
      .prepare(`DELETE FROM app_admins WHERE user_id = ?`)
      .bind(userId),
    db.prepare(`DELETE FROM "user" WHERE id = ?`).bind(userId),
  ]);

  return results.at(-1);
}
