export type ManualJobInput = {
  title: string;
  company: string;
  detailUrl: string;
  deadlineAt?: string | null;
};

function normalizeRequiredText(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} cannot be empty.`);
  }

  if (normalized.length > 240) {
    throw new Error(`${label} is too long.`);
  }

  return normalized;
}

export function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDetailUrl(value: string) {
  const rawValue = value.trim();

  if (!rawValue) {
    throw new Error("Job page URL is required.");
  }

  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    throw new Error("Job page URL must be a valid HTTPS URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Job page URL must use HTTPS.");
  }

  url.hash = "";
  return url.toString();
}

export function normalizeManualJobInput(input: ManualJobInput) {
  const deadlineAt = input.deadlineAt?.trim() ?? "";

  if (deadlineAt && !isValidDateOnly(deadlineAt)) {
    throw new Error("Deadline must use YYYY-MM-DD format.");
  }

  return {
    title: normalizeRequiredText(input.title, "Role"),
    company: normalizeRequiredText(input.company, "Company"),
    detailUrl: normalizeDetailUrl(input.detailUrl),
    deadlineAt: deadlineAt || null,
  };
}
