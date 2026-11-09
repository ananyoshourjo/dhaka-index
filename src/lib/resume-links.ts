export function normalizeGitHubLink(value: string | null | undefined) {
  const input = value?.trim() ?? "";
  if (!input) return "";
  const candidate = /^[a-z][a-z\d+.-]*:|^\/\/|^(?:www\.)?github\.com\//i.test(input)
    ? input
    : `https://github.com/${input.replace(/^@/, "")}`;
  const normalized = normalizeResumeLink(candidate);
  if (!normalized) return "";
  const url = new URL(normalized);
  return ["github.com", "www.github.com"].includes(url.hostname) && !url.username && !url.password
    ? normalized
    : "";
}

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
