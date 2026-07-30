import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";

import { getAuth, type AuthSession } from "@/app/lib/auth";
import { statement } from "@/app/lib/cloud-db";

export async function getSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}

export async function requireAdmin(): Promise<AuthSession["user"]> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await statement(
    `SELECT 1 AS present FROM app_admins WHERE user_id = ?`,
    [session.user.id],
  ).first();

  if (!isAdmin) {
    forbidden();
  }

  return session.user;
}
