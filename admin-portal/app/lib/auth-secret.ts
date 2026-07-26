import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function getAuthSecret() {
  const configured = process.env.BETTER_AUTH_SECRET?.trim();

  if (configured) {
    if (configured.length < 32) {
      throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
    }

    return configured;
  }

  const dataDirectory = path.resolve(
    process.env.DHAKA_INDEX_DATA_DIR ?? path.join(process.cwd(), "..", "data"),
  );
  const secretPath = path.join(dataDirectory, "auth-secret");

  fs.mkdirSync(dataDirectory, { recursive: true });

  if (!fs.existsSync(secretPath)) {
    const generated = randomBytes(48).toString("base64url");

    try {
      fs.writeFileSync(secretPath, `${generated}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }

  const secret = fs.readFileSync(secretPath, "utf8").trim();

  if (secret.length < 32) {
    throw new Error(`The generated authentication secret at ${secretPath} is invalid.`);
  }

  return secret;
}
