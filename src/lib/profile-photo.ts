import "server-only";

import { getCloudflareDb } from "@/lib/cloudflare";
import { decodeLocalPhoto, sanitizeLocalPhoto } from "@/lib/photo";

const PROFILE_PHOTO_PATH = "/api/profile/photo";
const PROFILE_PHOTO_CACHE_VERSION = "2";

type ProfilePhotoRow = {
  image_blob: ArrayBuffer | null;
  content_type: string | null;
  legacy_data_url: string | null;
  updated_at: string;
};

function versionedPhotoUrl(updatedAt: string) {
  return `${PROFILE_PHOTO_PATH}?v=${PROFILE_PHOTO_CACHE_VERSION}-${encodeURIComponent(updatedAt)}`;
}

export async function getProfilePhoto(userId: string) {
  const db = getCloudflareDb();
  const photo =
    (await db
      .prepare(
        `SELECT image_blob, content_type, legacy_data_url, updated_at FROM profile_photos WHERE user_id = ?`,
      )
      .bind(userId)
      .first<ProfilePhotoRow>()) ?? null;

  if (!photo?.legacy_data_url) {
    return photo;
  }

  const legacy = decodeLocalPhoto(photo.legacy_data_url);

  if (!legacy) {
    await db
      .prepare(`DELETE FROM profile_photos WHERE user_id = ?`)
      .bind(userId)
      .run();
    return null;
  }

  await db
    .prepare(
      `UPDATE profile_photos SET image_blob = ?, content_type = ?, legacy_data_url = NULL WHERE user_id = ?`,
    )
    .bind(legacy.bytes, legacy.contentType, userId)
    .run();

  return {
    ...photo,
    image_blob: legacy.bytes,
    content_type: legacy.contentType,
    legacy_data_url: null,
  };
}

export async function getProfilePhotoUrl(userId: string) {
  const photo = await getProfilePhoto(userId);
  return photo ? versionedPhotoUrl(photo.updated_at) : "";
}

export async function getProfilePhotoDataUrl(userId: string) {
  const photo = await getProfilePhoto(userId);

  if (!photo) {
    return "";
  }

  return `data:${photo.content_type};base64,${Buffer.from(photo.image_blob!).toString("base64")}`;
}

export async function saveProfilePhoto(userId: string, image: ArrayBuffer) {
  const updatedAt = new Date().toISOString();

  await getCloudflareDb()
    .prepare(
      `
        INSERT INTO profile_photos (user_id, image_blob, content_type, legacy_data_url, updated_at)
        VALUES (?, ?, 'image/webp', NULL, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          image_blob = excluded.image_blob,
          content_type = excluded.content_type,
          legacy_data_url = NULL,
          updated_at = excluded.updated_at
      `,
    )
    .bind(userId, image, updatedAt)
    .run();

  return versionedPhotoUrl(updatedAt);
}

export async function deleteProfilePhoto(userId: string) {
  await getCloudflareDb()
    .prepare(`DELETE FROM profile_photos WHERE user_id = ?`)
    .bind(userId)
    .run();
}

export async function migrateLegacyProfilePhoto(
  userId: string,
  resumePhotoUrl: string,
) {
  const db = getCloudflareDb();
  const existing = await getProfilePhoto(userId);
  const user = await db
    .prepare(`SELECT image FROM "user" WHERE "id" = ?`)
    .bind(userId)
    .first<{ image: string | null }>();
  const legacyUserPhoto = sanitizeLocalPhoto(user?.image ?? "");
  const legacyPhoto = decodeLocalPhoto(
    sanitizeLocalPhoto(resumePhotoUrl) || legacyUserPhoto,
  );
  const statements: D1PreparedStatement[] = [];
  let photo = existing;

  if (!photo && legacyPhoto) {
    const updatedAt = new Date().toISOString();
    statements.push(
      db
        .prepare(
          `INSERT INTO profile_photos (user_id, image_blob, content_type, legacy_data_url, updated_at) VALUES (?, ?, ?, NULL, ?)`,
        )
        .bind(userId, legacyPhoto.bytes, legacyPhoto.contentType, updatedAt),
    );
    photo = {
      image_blob: legacyPhoto.bytes,
      content_type: legacyPhoto.contentType,
      legacy_data_url: null,
      updated_at: updatedAt,
    };
  }

  if (legacyUserPhoto) {
    statements.push(
      db
        .prepare(`UPDATE "user" SET "image" = NULL, "updatedAt" = ? WHERE "id" = ?`)
        .bind(new Date().toISOString(), userId),
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return photo ? versionedPhotoUrl(photo.updated_at) : "";
}
