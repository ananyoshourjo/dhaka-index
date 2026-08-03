export function normalizeResumeLink(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    return "";
  }

  const candidate = normalized.startsWith("//")
    ? `https:${normalized}`
    : /^[a-z][a-z\d+.-]*:/i.test(normalized)
      ? normalized
      : `https://${normalized}`;

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}
