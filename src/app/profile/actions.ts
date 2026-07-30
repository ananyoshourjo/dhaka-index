"use server";

import { revalidatePath } from "next/cache";

import {
  saveResumeContent,
  type ResumeContent,
} from "@/lib/resume";
import { requireUser } from "@/lib/session";

export async function saveResumeAction(content: ResumeContent) {
  const user = await requireUser();

  if (Buffer.byteLength(JSON.stringify(content), "utf8") > 1_500_000) {
    throw new Error("The resume is larger than the hosted storage limit.");
  }

  await saveResumeContent(user.id, content);
  revalidatePath("/profile");
}
