const DEFAULT_ROUTES = [
  "/",
  "/profile",
  "/bookmarks",
  "/archive",
  "/settings",
];

function printHelp() {
  console.log(`Usage: npm run health:hosted

Required:
  DHAKA_INDEX_HEALTH_BASE_URL   Hosted member-app origin

Authentication (choose one):
  DHAKA_INDEX_HEALTH_COOKIE     Existing Better Auth Cookie header value
  DHAKA_INDEX_HEALTH_EMAIL      Dedicated synthetic-check account email
  DHAKA_INDEX_HEALTH_PASSWORD   Dedicated synthetic-check account password

Optional:
  DHAKA_INDEX_HEALTH_REQUESTS   Requests per route (default: 20)
  DHAKA_INDEX_HEALTH_ROUTES     Comma-separated paths

The checker never prints credentials or cookies. When it signs in with email
and password, it signs that synthetic session out before exiting.`);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function cookieHeaderFrom(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

  return values.map((value) => value.split(";", 1)[0]).join("; ");
}

async function signIn(baseUrl, email, password) {
  const response = await fetch(new URL("/api/auth/sign-in/email", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: baseUrl.origin,
    },
    body: JSON.stringify({ email, password }),
  });
  const cookie = cookieHeaderFrom(response);

  if (!response.ok || !cookie) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(
      `Synthetic sign-in failed with HTTP ${response.status}${body ? `: ${body}` : "."}`,
    );
  }

  return cookie;
}

async function signOut(baseUrl, cookie) {
  await fetch(new URL("/api/auth/sign-out", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      Accept: "application/json",
      Cookie: cookie,
      Origin: baseUrl.origin,
      "X-Dhaka-Index-Health-Check": "1",
    },
  }).catch(() => undefined);
}

async function checkRoute(baseUrl, route, cookie, requestCount) {
  const durations = [];
  const failures = [];
  let largestResponseBytes = 0;

  for (let attempt = 1; attempt <= requestCount; attempt += 1) {
    const startedAt = performance.now();
    const response = await fetch(new URL(route, baseUrl), {
      redirect: "manual",
      headers: {
        Accept: "text/html",
        "Cache-Control": "no-cache",
        Cookie: cookie,
        "X-Dhaka-Index-Health-Check": "1",
      },
    });
    const body = await response.text();
    const durationMs = performance.now() - startedAt;
    const responseBytes = Buffer.byteLength(body, "utf8");

    durations.push(durationMs);
    largestResponseBytes = Math.max(largestResponseBytes, responseBytes);

    if (
      response.status < 200 ||
      response.status >= 300 ||
      /(?:Error 1102|Worker exceeded resource limits)/i.test(body)
    ) {
      failures.push({ attempt, status: response.status, durationMs });
    }
  }

  return {
    route,
    requests: requestCount,
    failures,
    p50Ms: Math.round(percentile(durations, 0.5)),
    p95Ms: Math.round(percentile(durations, 0.95)),
    maxMs: Math.round(Math.max(...durations)),
    largestResponseBytes,
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const rawBaseUrl = process.env.DHAKA_INDEX_HEALTH_BASE_URL?.trim();

  if (!rawBaseUrl) {
    throw new Error("DHAKA_INDEX_HEALTH_BASE_URL is required.");
  }

  const baseUrl = new URL(rawBaseUrl);
  const requestCount = positiveInteger(
    process.env.DHAKA_INDEX_HEALTH_REQUESTS,
    20,
  );
  const routes = (process.env.DHAKA_INDEX_HEALTH_ROUTES ?? "")
    .split(",")
    .map((route) => route.trim())
    .filter(Boolean);
  const configuredCookie = process.env.DHAKA_INDEX_HEALTH_COOKIE?.trim();
  const email = process.env.DHAKA_INDEX_HEALTH_EMAIL?.trim();
  const password = process.env.DHAKA_INDEX_HEALTH_PASSWORD;
  let cookie = configuredCookie;
  let createdSession = false;

  if (!cookie) {
    if (!email || !password) {
      throw new Error(
        "Set DHAKA_INDEX_HEALTH_COOKIE or both DHAKA_INDEX_HEALTH_EMAIL and DHAKA_INDEX_HEALTH_PASSWORD.",
      );
    }

    cookie = await signIn(baseUrl, email, password);
    createdSession = true;
  }

  const results = [];

  try {
    for (const route of routes.length > 0 ? routes : DEFAULT_ROUTES) {
      results.push(await checkRoute(baseUrl, route, cookie, requestCount));
    }
  } finally {
    if (createdSession) {
      await signOut(baseUrl, cookie);
    }
  }

  console.log(JSON.stringify({ baseUrl: baseUrl.origin, results }, null, 2));

  const failedRequests = results.reduce(
    (total, result) => total + result.failures.length,
    0,
  );

  if (failedRequests > 0) {
    throw new Error(`${failedRequests} hosted route checks failed.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
