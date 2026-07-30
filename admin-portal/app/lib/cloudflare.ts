import { getCloudflareContext } from "@opennextjs/cloudflare";

export type DhakaIndexAdminCloudflareEnv = CloudflareEnv & {
  ADMIN_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  DB: D1Database;
  DHAKA_INDEX_TRUSTED_ORIGINS?: string;
};

export function getCloudflareEnv() {
  return getCloudflareContext().env as DhakaIndexAdminCloudflareEnv;
}

export function getCloudflareDb() {
  return getCloudflareEnv().DB;
}
