import { NextResponse } from "next/server";

import { getCloudflareEnv } from "@/lib/cloudflare";
import { syncJobFeed } from "@/lib/job-feed";
import { getSession } from "@/lib/session";

function isScheduledSync(request: Request) {
  const expected = getCloudflareEnv().JOB_SYNC_SECRET;
  const syncKey = request.headers.get("x-dhaka-index-sync-key");

  return Boolean(
    expected &&
      syncKey === expected &&
      request.headers.get("x-dhaka-index-sync-source") === "cloudflare-cron",
  );
}

export async function POST(request: Request) {
  const scheduled = isScheduledSync(request);

  if (!scheduled) {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    return NextResponse.json(await syncJobFeed({ force: scheduled }));
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
