import "server-only";

import { statement } from "@/app/lib/cloud-db";

const LEGACY_PROFILE_PHOTO_PATTERN =
  /^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=\r\n]+)$/i;

export type AdminProfilePhotoRow = {
  imageBlob: ArrayBuffer | ArrayBufferView | number[] | null;
  contentType: string | null;
  legacyDataUrl: string | null;
  updatedAt: string;
};

export function getAdminProfilePhotoUrl(userId: string, updatedAt: string) {
  return `/api/users/${encodeURIComponent(userId)}/photo?v=${encodeURIComponent(updatedAt)}`;
}

export function getAdminProfilePhotoBody(photo: AdminProfilePhotoRow) {
  const legacyPhoto = decodeLegacyDataUrl(photo.legacyDataUrl);
  const image = toArrayBuffer(photo.imageBlob) ?? legacyPhoto?.image;

  if (!image) {
    return null;
  }

  const contentType = photo.contentType?.toLowerCase() ?? legacyPhoto?.contentType;

  if (
    contentType !== "image/webp" &&
    contentType !== "image/png" &&
    contentType !== "image/jpeg"
  ) {
    return null;
  }

  return { image, contentType };
}

export function getAdminProfilePhoto(userId: string) {
  return statement(
    `
      SELECT
        image_blob AS imageBlob,
        content_type AS contentType,
        legacy_data_url AS legacyDataUrl,
        updated_at AS updatedAt
      FROM profile_photos
      WHERE user_id = ?
    `,
    [userId],
  ).first<AdminProfilePhotoRow>();
}

function toArrayBuffer(value: unknown) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return Uint8Array.from(value).buffer;
  }

  if (value instanceof ArrayBuffer) {
    return value;
  }

  if (!ArrayBuffer.isView(value)) {
    return null;
  }

  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function decodeLegacyDataUrl(value: string | null) {
  if (!value) {
    return null;
  }

  const match = LEGACY_PROFILE_PHOTO_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));

  return bytes.byteLength > 0
    ? { image: bytes.buffer, contentType: match[1].toLowerCase() }
    : null;
}
