// @ts-expect-error OpenNext generates this module during the Cloudflare build.
import handler from "./.open-next/worker.js";

type ScheduledEnv = CloudflareEnv & {
  BETTER_AUTH_URL: string;
  JOB_SYNC_SECRET: string;
};

export default {
  fetch: handler.fetch,

  async scheduled(
    _controller: ScheduledController,
    env: ScheduledEnv,
    context: ExecutionContext,
  ) {
    if (!env.JOB_SYNC_SECRET) {
      throw new Error("JOB_SYNC_SECRET is not configured.");
    }

    const request = new Request(new URL("/api/jobs/sync", env.BETTER_AUTH_URL), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "X-Dhaka-Index-Sync-Key": env.JOB_SYNC_SECRET,
        "X-Dhaka-Index-Sync-Source": "cloudflare-cron",
      },
    });
    const response = await handler.fetch(request, env, context);

    if (!response.ok) {
      throw new Error(
        `Scheduled job synchronization returned HTTP ${response.status}.`,
      );
    }

    await response.arrayBuffer();
  },
} satisfies ExportedHandler<ScheduledEnv>;
