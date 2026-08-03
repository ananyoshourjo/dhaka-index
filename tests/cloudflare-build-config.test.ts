import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

function prepareConfig(publicUrl: string, adminUrl: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dhaka-index-build-"));

  try {
    fs.mkdirSync(path.join(root, "scripts"));
    fs.mkdirSync(path.join(root, "admin-portal"));
    fs.copyFileSync(
      path.join(process.cwd(), "scripts", "prepare-cloudflare-build.mjs"),
      path.join(root, "scripts", "prepare-cloudflare-build.mjs"),
    );
    fs.copyFileSync(
      path.join(process.cwd(), "wrangler.example.jsonc"),
      path.join(root, "wrangler.example.jsonc"),
    );
    fs.copyFileSync(
      path.join(process.cwd(), "admin-portal", "wrangler.example.jsonc"),
      path.join(root, "admin-portal", "wrangler.example.jsonc"),
    );

    execFileSync(
      process.execPath,
      [path.join(root, "scripts", "prepare-cloudflare-build.mjs")],
      {
        cwd: root,
        env: {
          ...process.env,
          DHAKA_INDEX_D1_DATABASE_ID: "00000000-0000-0000-0000-000000000001",
          DHAKA_INDEX_PUBLIC_URL: publicUrl,
          DHAKA_INDEX_ADMIN_URL: adminUrl,
        },
        stdio: "pipe",
      },
    );

    return {
      main: JSON.parse(
        fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"),
      ),
      admin: JSON.parse(
        fs.readFileSync(
          path.join(root, "admin-portal", "wrangler.jsonc"),
          "utf8",
        ),
      ),
    };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("official builds use the stable admin custom domain", () => {
  const { main, admin } = prepareConfig(
    "https://dhakaindex.com",
    "https://dhaka-index-admin.example.workers.dev",
  );

  assert.equal(main.vars.BETTER_AUTH_URL, "https://dhakaindex.com");
  assert.equal(main.vars.ADMIN_PORTAL_URL, "https://admin.dhakaindex.com");
  assert.equal(admin.vars.ADMIN_AUTH_URL, "https://admin.dhakaindex.com");
  assert.equal(
    admin.vars.DHAKA_INDEX_TRUSTED_ORIGINS,
    "https://dhakaindex.com,https://admin.dhakaindex.com",
  );
  assert.equal(admin.workers_dev, false);
  assert.deepEqual(admin.routes, [
    { pattern: "admin.dhakaindex.com", custom_domain: true },
  ]);
});

test("non-production builds preserve configured workers.dev origins", () => {
  const { main, admin } = prepareConfig(
    "https://preview.example.workers.dev",
    "https://admin-preview.example.workers.dev",
  );

  assert.equal(
    main.vars.ADMIN_PORTAL_URL,
    "https://admin-preview.example.workers.dev",
  );
  assert.equal(admin.workers_dev, true);
  assert.equal(admin.routes, undefined);
});
