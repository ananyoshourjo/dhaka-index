export const SENIORITY_LEVELS = ["Internship", "Entry level", "Mid level", "Senior", "Lead / Manager", "Head / Director", "Not specified"] as const;
export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];

// Ordered from specific exceptions to broad titles; Executive alone is not C-suite.
export const SENIORITY_RULES: readonly { level: SeniorityLevel; terms: readonly string[] }[] = [
  { level: "Internship", terms: ["intern", "internship"] },
  { level: "Mid level", terms: ["assistant manager", "asst manager", "associate manager", "deputy manager", "assistant director"] },
  { level: "Head / Director", terms: ["head", "director", "chief", "vice president", "vp", "ceo", "cfo", "cto", "coo", "general manager"] },
  { level: "Lead / Manager", terms: ["manager", "lead", "leader", "supervisor"] },
  { level: "Senior", terms: ["senior", "sr", "principal", "staff engineer", "experienced"] },
  { level: "Entry level", terms: ["junior", "jr", "entry level", "fresher", "freshers", "graduate", "trainee", "apprentice", "assistant", "associate", "executive", "officer"] },
  { level: "Mid level", terms: ["specialist", "engineer", "developer", "designer", "analyst", "administrator", "accountant", "coordinator", "consultant"] },
];
const punctuation = [".", ",", "/", "-", "(", ")", ":", "_", "\n", "\r", "\t"];
function normalize(title: string) {
  for (const mark of punctuation) title = title.split(mark).join(" ");
  return ` ${title.toLowerCase()} `;
}
export function classifySeniority(title: string): SeniorityLevel {
  const normalized = normalize(title);
  return SENIORITY_RULES.find(({ terms }) => terms.some((term) => normalized.includes(` ${term} `)))?.level ?? "Not specified";
}
export function isSeniorityLevel(value: unknown): value is SeniorityLevel {
  return typeof value === "string" && (SENIORITY_LEVELS as readonly string[]).includes(value);
}
// Generate the database rules from the same ordered rules used by the app.
export function senioritySql(title: string) {
  let normalized = `lower(${title})`;
  for (const mark of punctuation) normalized = `replace(${normalized}, '${mark}', ' ')`;
  normalized = `(' ' || ${normalized} || ' ')`;
  return "CASE\n" + SENIORITY_RULES.map(({level, terms}) => `WHEN ${terms.map(term => `instr(${normalized}, ' ${term} ') > 0`).join(" OR ")} THEN '${level}'`).join("\n") + "\nELSE 'Not specified' END";
}
