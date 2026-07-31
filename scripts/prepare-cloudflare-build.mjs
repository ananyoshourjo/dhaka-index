import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for a Cloudflare build.`);
  }

  return value;
}

function requiredHttpsUrl(name) {
  const value = requiredEnvironmentValue(name);
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }

  return url.origin;
}

function readTemplate(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8"),
  );
}

function writeConfig(relativePath, config) {
  fs.writeFileSync(
    path.join(repositoryRoot, relativePath),
    `${JSON.stringify(config, null, 2)}\n`,
  );
}

const databaseId = requiredEnvironmentValue("DHAKA_INDEX_D1_DATABASE_ID");
const publicUrl = requiredHttpsUrl("DHAKA_INDEX_PUBLIC_URL");
const adminUrl = requiredHttpsUrl("DHAKA_INDEX_ADMIN_URL");
const trustedOrigins = `${publicUrl},${adminUrl}`;

if (!/^[0-9a-f-]{36}$/i.test(databaseId)) {
  throw new Error("DHAKA_INDEX_D1_DATABASE_ID must be a valid D1 identifier.");
}

const mainConfig = readTemplate("wrangler.example.jsonc");
mainConfig.d1_databases[0].database_id = databaseId;
mainConfig.vars.BETTER_AUTH_URL = publicUrl;
mainConfig.vars.ADMIN_PORTAL_URL = adminUrl;
mainConfig.vars.DHAKA_INDEX_TRUSTED_ORIGINS = trustedOrigins;

const adminConfig = readTemplate("admin-portal/wrangler.example.jsonc");
adminConfig.d1_databases[0].database_id = databaseId;
adminConfig.vars.ADMIN_AUTH_URL = adminUrl;
adminConfig.vars.DHAKA_INDEX_TRUSTED_ORIGINS = trustedOrigins;

writeConfig("wrangler.jsonc", mainConfig);
writeConfig("admin-portal/wrangler.jsonc", adminConfig);

console.log("Prepared account-specific Wrangler configuration.");
