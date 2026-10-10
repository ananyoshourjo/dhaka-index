export type JobContent = {
  description?: string | null;
  applyUrl?: string | null;
  applicationInstructions?: string | null;
  contentCheckedAt?: string | null;
};

export function applicationRequiresLogin(url: string) {
  return /\/(?:login|signin|sign-in)(?:[/?]|$)|\/auth\//i.test(url);
}

export function validateApplicationUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 4000)
    throw new Error("Invalid application destination.");
  const url = new URL(value.trim());
  if (url.username || url.password)
    throw new Error("Application URLs cannot contain credentials.");
  if (url.protocol === "mailto:") {
    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(url.pathname))
      throw new Error("Invalid application email.");
  } else if (url.protocol !== "https:")
    throw new Error("Application URLs must use HTTPS or email.");
  return url.toString();
}

export function validateJobContent(input: JobContent): JobContent {
  const content: JobContent = {};
  for (const key of ["description", "applicationInstructions"] as const) {
    if (input[key] !== undefined) {
      const value = input[key];
      content[key] = typeof value === "string" ? value.trim() || null : null;
    }
  }
  if (input.applyUrl !== undefined)
    content.applyUrl = validateApplicationUrl(input.applyUrl);
  if (input.contentCheckedAt !== undefined) {
    content.contentCheckedAt = typeof input.contentCheckedAt === "string" && !Number.isNaN(Date.parse(input.contentCheckedAt)) ? input.contentCheckedAt : null;
  }
  return content;
}
