import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
