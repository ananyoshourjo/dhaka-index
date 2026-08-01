import { NextResponse } from "next/server";

import { getWebpDimensions } from "@/lib/photo";
import {
  deleteProfilePhoto,
  getProfilePhoto,
  saveProfilePhoto,
} from "@/lib/profile-photo";
import { getSession } from "@/lib/session";

const MAX_UPLOAD_BYTES = 160 * 1024;
const MAX_DIMENSION = 512;

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return new Response(null, { status: 401 });
  }

  const photo = await getProfilePhoto(session.user.id);

  if (!photo) {
    return new Response(null, { status: 404 });
  }

  const versioned = new URL(request.url).searchParams.has("v");

  return new Response(photo.image_blob!, {
    headers: {
      "Cache-Control": versioned
        ? "private, max-age=31536000, immutable"
        : "private, no-cache",
      "Content-Type": photo.content_type!,
      ETag: `"${photo.updated_at}"`,
    },
  });
}

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);

  if (
    request.headers.get("content-type") !== "image/webp" ||
    declaredLength > MAX_UPLOAD_BYTES
  ) {
    return NextResponse.json(
      { error: "Upload a compressed WebP thumbnail." },
      { status: 415 },
    );
  }

  const image = await request.arrayBuffer();

  if (image.byteLength === 0 || image.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "The compressed photo is too large." },
      { status: 413 },
    );
  }

  const dimensions = getWebpDimensions(new Uint8Array(image));

  if (
    !dimensions ||
    dimensions.width > MAX_DIMENSION ||
    dimensions.height > MAX_DIMENSION
  ) {
    return NextResponse.json(
      { error: "The photo thumbnail is invalid or too large." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    photoUrl: await saveProfilePhoto(session.user.id, image),
  });
}

export async function DELETE() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await deleteProfilePhoto(session.user.id);
  return new Response(null, { status: 204 });
}
