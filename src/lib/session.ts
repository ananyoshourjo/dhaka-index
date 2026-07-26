import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type AuthSession } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireUser(): Promise<AuthSession["user"]> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session.user;
}
