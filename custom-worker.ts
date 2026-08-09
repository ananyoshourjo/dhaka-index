// @ts-expect-error OpenNext generates this module during the Cloudflare build.
import handler from "./.open-next/worker.js";

type ScheduledEnv = CloudflareEnv & {
  BETTER_AUTH_URL: string;
  JOB_SYNC_SECRET: string;
};

export default {
  async fetch(request, env, context) {
    const startedAt = Date.now();
    let status = 500;

    try {
      const response = await handler.fetch(request, env, context);
      status = response.status;
      return response;
    } finally {
      const durationMs = Date.now() - startedAt;
      const traced = request.headers.get("x-dhaka-index-health-check") === "1";

      if (traced || status >= 500 || durationMs >= 500) {
        console.log(
          JSON.stringify({
            type: "dhaka-index-request",
            method: request.method,
            path: new URL(request.url).pathname,
            status,
            durationMs,
          }),
        );
      }
    }
  },

  async scheduled(
    _controller: ScheduledController,
    env: ScheduledEnv,
    context: ExecutionContext,
  ) {
    const startedAt = Date.now();
    let status = 500;

    try {
      if (!env.JOB_SYNC_SECRET) {
        throw new Error("JOB_SYNC_SECRET is not configured.");
      }

      const request = new Request(
        new URL("/api/jobs/sync", env.BETTER_AUTH_URL),
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "X-Dhaka-Index-Sync-Key": env.JOB_SYNC_SECRET,
            "X-Dhaka-Index-Sync-Source": "cloudflare-cron",
          },
        },
      );
      const response = await handler.fetch(request, env, context);
      status = response.status;

      if (!response.ok) {
        throw new Error(
          `Scheduled job synchronization returned HTTP ${response.status}.`,
        );
      }

      await response.arrayBuffer();
    } finally {
      console.log(
        JSON.stringify({
          type: "dhaka-index-job-sync",
          trigger: "cloudflare-cron",
          status,
          durationMs: Date.now() - startedAt,
        }),
      );
    }
  },
} satisfies ExportedHandler<ScheduledEnv>;
