import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getAuthSecret } from "@/lib/auth-secret";
import {
  cleanupUserData,
  db,
  ensureAdminSetupAvailable,
  initDb,
} from "@/lib/db";

initDb();

const isProductionBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

if (!isProductionBuild) {
  ensureAdminSetupAvailable();
}

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
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        cleanupUserData(user.id);
      },
      afterDelete: async () => {
        ensureAdminSetupAvailable();
      },
    },
  },
  baseURL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  trustedOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL ?? "",
    ...configuredOrigins,
  ].filter(Boolean),
});

export type AuthSession = typeof auth.$Infer.Session;
