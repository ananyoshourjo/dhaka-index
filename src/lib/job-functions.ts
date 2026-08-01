export const JOB_FUNCTIONS = [
  "Finance & Accounting",
  "Marketing & Communications",
  "Sales & Business Development",
  "Software & IT",
  "Data & Analytics",
  "Product, Project & Strategy",
  "Design & Creative",
  "Operations & Supply Chain",
  "People & Human Resources",
  "Customer Service & Support",
  "Legal, Risk & Compliance",
  "Education & Research",
  "Healthcare & Life Sciences",
  "Engineering & Technical",
  "Administration",
  "Other",
] as const;

export type JobFunction = (typeof JOB_FUNCTIONS)[number];

type JobFunctionRule = {
  jobFunction: Exclude<JobFunction, "Other">;
  pattern: RegExp;
};

const JOB_FUNCTION_RULES: JobFunctionRule[] = [
  {
    jobFunction: "Finance & Accounting",
    pattern:
      /\b(finance|financial|accounting|accounts|accountant|audit|auditor|billing|budget|cash|credit|collections?|treasury|tax|vat|remittance|banker|banking|investment)\b/i,
  },
  {
    jobFunction: "Marketing & Communications",
    pattern:
      /\b(marketing|brand(?:ing|s)?|communications?|media|content|public relations|pr|martech|promotion|advertising|growth|visibility|lifecycle|campaign)\b/i,
  },
  {
    jobFunction: "Sales & Business Development",
    pattern:
      /\b(sales|telesales|business development|commercial|territory|key account|account management|relationship (?:manager|officer)|partnership|acquisition|export|tender)\b/i,
  },
  {
    jobFunction: "Software & IT",
    pattern:
      /\b(software|developer|development,? it|front[ -]?end|full[ -]?stack|mobile app|android|ios|flutter|react|java|\.net|devops|sre|platform engineer|qa engineer|sqa|testing|network engineer|cyber ?security|information security|infosec|system administrator|it operations|erp|dynamics 365)\b/i,
  },
  {
    jobFunction: "Data & Analytics",
    pattern:
      /\b(data|analytics?|business intelligence|data science|machine learning|artificial intelligence|gen ai|ai lead|measurement)\b/i,
  },
  {
    jobFunction: "Product, Project & Strategy",
    pattern:
      /\b(product manager|product management|product marketing|project manager|project management|program manager|programme manager|strategy|strategic planning|pmo|uat management)\b/i,
  },
  {
    jobFunction: "Design & Creative",
    pattern:
      /\b(ui\/?ux|ux|designer|design|creative|animator|animation|artist|motion)\b/i,
  },
  {
    jobFunction: "Operations & Supply Chain",
    pattern:
      /\b(operations?|supply chain|logistics|warehouse|procurement|production|manufacturing|merchandising|courier|distribution|fleet|service,? agri|mechanic|driver|runner)\b/i,
  },
  {
    jobFunction: "People & Human Resources",
    pattern:
      /\b(human resources?|human resource|hrbp|hr manager|hr executive|people (?:generalist|partner|experience)|talent acquisition|employee relations|learning (?:and|&) development|lld)\b/i,
  },
  {
    jobFunction: "Customer Service & Support",
    pattern:
      /\b(customer (?:service|success|experience)|client (?:service|success)|product support|support (?:coordinator|specialist)|partner service|call quality|front desk|contact cent(?:er|re))\b/i,
  },
  {
    jobFunction: "Legal, Risk & Compliance",
    pattern:
      /\b(legal|compliance|aml|cft|fraud|risk|governance|regulatory|documentation)\b/i,
  },
  {
    jobFunction: "Education & Research",
    pattern:
      /\b(instructor|teacher|teaching|academic|education|research|training|learning facilitation|counsellor|curriculum)\b/i,
  },
  {
    jobFunction: "Healthcare & Life Sciences",
    pattern:
      /\b(healthcare|healthtech|pharma(?:ceutical)?|medical|medico|clinical|doctor|hospital|life sciences?|r&d)\b/i,
  },
  {
    jobFunction: "Engineering & Technical",
    pattern:
      /\b(engineer|engineering|technical|machiner(?:y|ies)|maintenance|electrical|mechanical|industrial engineering|chartered engineer)\b/i,
  },
  {
    jobFunction: "Administration",
    pattern: /\b(administration|administrative|admin|office management|secretary)\b/i,
  },
];

export function isJobFunction(value: unknown): value is JobFunction {
  return (
    typeof value === "string" &&
    (JOB_FUNCTIONS as readonly string[]).includes(value)
  );
}

export function classifyJobFunctions(title: string): JobFunction[] {
  const matches = JOB_FUNCTION_RULES.filter(({ pattern }) => pattern.test(title)).map(
    ({ jobFunction }) => jobFunction,
  );

  return matches.length > 0 ? matches : ["Other"];
}

export function serializeJobFunctions(jobFunctions: readonly JobFunction[]) {
  const unique = JOB_FUNCTIONS.filter((jobFunction) =>
    jobFunctions.includes(jobFunction),
  );
  return `|${(unique.length > 0 ? unique : ["Other"]).join("|")}|`;
}

export function parseJobFunctions(value: string): JobFunction[] {
  const parsed = value.split("|").filter(isJobFunction);
  return parsed.length > 0 ? parsed : ["Other"];
}

export function jobFunctionSearchToken(jobFunction: JobFunction) {
  return `|${jobFunction}|`;
}
