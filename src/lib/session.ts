import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth, type AuthSession } from "@/lib/auth";

export async function getSession() {
  return getAuth().api.getSession({
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
