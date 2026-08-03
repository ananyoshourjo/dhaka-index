import {
  getAdminProfilePhoto,
  getAdminProfilePhotoBody,
} from "@/app/lib/profile-photo";
import { requireAdmin } from "@/app/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  await requireAdmin();

  const { userId } = await params;
  const photo = await getAdminProfilePhoto(userId);

  if (!photo) {
    return new Response(null, { status: 404 });
  }

  const body = getAdminProfilePhotoBody(photo);

  if (!body || body.image.byteLength === 0) {
    return new Response(null, { status: 404 });
  }

  const versioned = new URL(request.url).searchParams.has("v");

  return new Response(body.image, {
    headers: {
      "Cache-Control": versioned
        ? "private, max-age=31536000, immutable"
        : "private, no-cache",
      "Content-Type": body.contentType,
      ETag: `"${photo.updatedAt}"`,
    },
  });
}
