import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";

import { auth, type AuthSession } from "@/app/lib/auth";
import { db } from "@/app/lib/db";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAdmin(): Promise<AuthSession["user"]> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = db
    .prepare<[string]>(`SELECT 1 FROM app_admins WHERE user_id = ?`)
    .get(session.user.id);

  if (!isAdmin) {
    forbidden();
  }

  return session.user;
}
