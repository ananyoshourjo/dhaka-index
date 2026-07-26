import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getAuthSecret } from "@/app/lib/auth-secret";
import { db } from "@/app/lib/db";

const configuredOrigins =
  process.env.DHAKA_INDEX_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [nextCookies()],
  secret: getAuthSecret(),
  baseURL: process.env.ADMIN_AUTH_URL ?? "http://127.0.0.1:3010",
  trustedOrigins: [
    "http://127.0.0.1:3010",
    "http://localhost:3010",
    process.env.ADMIN_AUTH_URL ?? "",
    ...configuredOrigins,
  ].filter(Boolean),
});

export type AuthSession = typeof auth.$Infer.Session;
