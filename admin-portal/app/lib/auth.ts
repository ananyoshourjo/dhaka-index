import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getCloudflareEnv } from "@/app/lib/cloudflare";

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
    baseURL: env.ADMIN_AUTH_URL,
    trustedOrigins: [env.ADMIN_AUTH_URL, ...configuredOrigins].filter(Boolean),
  });
}

type Auth = ReturnType<typeof getAuth>;

export type AuthSession = Auth["$Infer"]["Session"];
