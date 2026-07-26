import { getAuthSecret } from "@/lib/auth-secret";
import { ensureAdminSetupAvailable, initDb } from "@/lib/db";

function main() {
  initDb();
  getAuthSecret();
  ensureAdminSetupAvailable();

  console.log("Dhaka Index local storage is ready.");

  if (!process.env.DHAKA_INDEX_JOB_FEED_URL) {
    console.warn(
      "DHAKA_INDEX_JOB_FEED_URL is not configured. Copy .env.example to .env.local and set the official feed URL.",
    );
  }
}

main();
