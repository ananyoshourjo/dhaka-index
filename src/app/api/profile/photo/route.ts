import { NextResponse } from "next/server";

import { getProfilePhotoUrl } from "@/lib/resume";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ photoUrl: "" }, { status: 401 });
  }

  return NextResponse.json({
    photoUrl: await getProfilePhotoUrl(session.user.id),
  });
}
