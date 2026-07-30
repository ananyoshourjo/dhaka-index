import "server-only";

import { getCloudflareDb } from "@/app/lib/cloudflare";

export function statement(sql: string, values: unknown[] = []) {
  return getCloudflareDb()
    .prepare(sql)
    .bind(...values);
}
