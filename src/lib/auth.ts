import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { cleanupUserData } from "@/lib/cloud-db";
import { getCloudflareEnv } from "@/lib/cloudflare";

export function getAuth() {
  const env = getCloudflareEnv();
  const configuredOrigins =
    env.DHAKA_INDEX_TRUSTED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  return betterAuth({
    database: env.DB,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    plugins: [nextCookies()],
    secret: env.BETTER_AUTH_SECRET,
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await cleanupUserData(user.id);
        },
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [
      env.BETTER_AUTH_URL,
      env.ADMIN_PORTAL_URL ?? "",
      ...configuredOrigins,
    ].filter(Boolean),
  });
}

type Auth = ReturnType<typeof getAuth>;

export type AuthSession = Auth["$Infer"]["Session"];
