"use server";

import { revalidatePath } from "next/cache";

import {
  saveResumeContent,
  type ResumeContent,
} from "@/lib/resume";
import { requireUser } from "@/lib/session";

export async function saveResumeAction(content: ResumeContent) {
  const user = await requireUser();

  if (Buffer.byteLength(JSON.stringify(content), "utf8") > 1_900_000) {
    throw new Error("The resume is larger than the local storage limit.");
  }

  saveResumeContent(user.id, content);
  revalidatePath("/profile");
}
