import { getCloudflareContext } from "@opennextjs/cloudflare";

export type DhakaIndexCloudflareEnv = CloudflareEnv & {
  ADMIN_PORTAL_URL?: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BROWSER: BrowserRun;
  DB: D1Database;
  DHAKA_INDEX_JOB_FEED_URL?: string;
  DHAKA_INDEX_TRUSTED_ORIGINS?: string;
};

export function getCloudflareEnv() {
  return getCloudflareContext().env as DhakaIndexCloudflareEnv;
}

export function getCloudflareDb() {
  return getCloudflareEnv().DB;
}
