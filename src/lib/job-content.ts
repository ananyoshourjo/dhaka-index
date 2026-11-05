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
  if (url.protocol === "https:" && (
    url.pathname === "/" ||
    url.pathname.startsWith("/cdn-cgi/l/email-protection") ||
    (url.hostname === "careers.optimizely.com" && url.pathname.startsWith("/talentcommunity/apply/") &&
      /^(1363501155|1367702255|1368790055|1369195455|1360527755|1356345655|1372786455|1374290155|1374513455)$/.test(url.pathname.split("/")[3])) ||
    (url.hostname === "jobs.jti.com" && /\/talentcommunity\/apply\/(1436482333|1432748233|1451038933)(?:\/|$)/.test(url.pathname)) ||
    (url.hostname === "fa-esth-saasfaprod1.fa.ocs.oraclecloud.com" && /\/job\/11894(?:\/|$)/.test(url.pathname))
  )) return null;
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

export function getApplicationDestination(value: unknown): string | null {
  try {
    return validateApplicationUrl(value);
  } catch {
    return null;
  }
}
