"use server";

import {
  saveResumeContent,
  type ResumeContent,
} from "@/lib/resume";
import { requireUser } from "@/lib/session";

export async function saveResumeAction(content: ResumeContent) {
  const user = await requireUser();

  if (Buffer.byteLength(JSON.stringify(content), "utf8") > 500_000) {
    return {
      error: "The resume is larger than the hosted storage limit.",
      ok: false as const,
      retryable: false,
    };
  }

  try {
    await saveResumeContent(user.id, content);
    return { ok: true as const };
  } catch (error) {
    console.error("Failed to autosave resume", error);
    return {
      error: "Save failed",
      ok: false as const,
      retryable: true,
    };
  }
}
