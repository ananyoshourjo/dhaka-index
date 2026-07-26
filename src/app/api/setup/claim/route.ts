import { NextResponse } from "next/server";

import { claimInitialAdmin } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!code || code.length > 128) {
      return NextResponse.json(
        { error: "Enter the administrator setup code." },
        { status: 400 },
      );
    }

    claimInitialAdmin(session.user.id, code);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed." },
      { status: 400 },
    );
  }
}
