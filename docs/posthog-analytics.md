# PostHog analytics

Dhaka Index uses PostHog only when both
`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` are present
in the member-app build. The admin portal does not load PostHog.

## Privacy contract

- Use the lazy-loaded `posthog-js` slim entrypoint.
- Identify signed-in users only by the opaque Better Auth user ID.
- Respect browser Do Not Track.
- Disable DOM autocapture, automatic page views, page leaves, session replay,
  heatmaps, surveys, feature flags, performance autocapture, dead clicks, and
  automatic exception capture.
- Never send names, email addresses, passwords, profile or resume content,
  cover-letter content, raw searches, raw URLs, referrers, error messages, or
  stack traces.
- Send only the typed events and properties defined in
  `src/lib/product-analytics.ts`.
- Configure the PostHog project to discard client IP data and set an explicit
  retention period before enabling production collection.

## Event catalogue

| Area | Events |
| --- | --- |
| Navigation | `page viewed` with a fixed safe route name and authentication state |
| Onboarding | `account signed up`, `account logged in`, `account authentication failed`, `account logged out` |
| Job discovery | `job search results viewed` with query-length bucket, selected canonical job function, page, result count, and zero-result state |
| Job actions | `job action completed` and `job action failed` for open, bookmark, bookmark removal, archive, and restore outcomes |
| Resume | `resume editing started`, first `resume save completed`, terminal `resume save failed`, `resume draft restored`, `profile photo changed`, `resume pdf downloaded`, and `resume pdf failed` |
| Settings | `job interest updated`, `account password changed`, `account export requested`, and account-deletion outcomes |
| Quality | `web vital measured` and `application error occurred` with sanitized category and fixed route only |

## Suggested funnels

1. Activation: `account signed up` → `job search results viewed` →
   `job action completed` where action is `opened` or `bookmarked`.
2. Application readiness: `page viewed` for `/profile` →
   `resume editing started` → `resume save completed` →
   `resume pdf downloaded`.
3. Job discovery: `job search results viewed` → `job action completed` where
   action is `opened` → `job action completed` where action is `bookmarked`.
4. Reliability impact: compare each funnel against `application error occurred`,
   `resume save failed`, `resume pdf failed`, and poor Web Vitals.

Use PostHog retention insights for weekly return to `page viewed`, repeated job
opens, and repeat resume editing. Avoid card-impression events unless a specific
future question requires that additional volume.
