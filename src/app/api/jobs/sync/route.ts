import { NextResponse } from "next/server";

import { syncJobFeed } from "@/lib/job-feed";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await syncJobFeed());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The job feed could not be updated.",
      },
      { status: 502 },
    );
  }
}
