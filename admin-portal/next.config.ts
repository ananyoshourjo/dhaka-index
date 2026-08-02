import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;

const adminPortalRoot = path.dirname(fileURLToPath(import.meta.url));

initOpenNextCloudflareForDev({
  persist: {
    path: path.resolve(adminPortalRoot, "..", ".wrangler", "state", "v3"),
  },
});
