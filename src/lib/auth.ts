import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { cleanupUserData } from "@/lib/cloud-db";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { isJobFunction } from "@/lib/job-functions";

function createAuth() {
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
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60,
        strategy: "compact",
      },
    },
    user: {
      additionalFields: {
        preferredJobFunction: {
          type: "string",
          required: true,
          transform: {
            input: (value) => {
              if (!isJobFunction(value)) {
                throw new Error("Choose a valid job interest.");
              }

              return value;
            },
          },
        },
      },
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
      ...(process.env.NODE_ENV === "development"
        ? ["http://127.0.0.1:3000", "http://localhost:3000"]
        : []),
      ...configuredOrigins,
    ].filter(Boolean),
  });
}

export type Auth = ReturnType<typeof createAuth>;

let cachedAuth: Auth | undefined;

export function getAuth(): Auth {
  cachedAuth ??= createAuth();
  return cachedAuth;
}

export type AuthSession = Auth["$Infer"]["Session"];
