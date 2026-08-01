# Self-hosting and security

Dhaka Index is deployed as two Cloudflare Workers backed by one D1 database.
The member Worker is public; the admin Worker also enforces the application's
administrator role on every protected page and operation.

## Minimum deployment requirements

1. Create one D1 database and bind it as `DB` in both Wrangler configurations.
2. Set `BETTER_AUTH_URL` and `ADMIN_AUTH_URL` to their exact public HTTPS
   origins.
3. Set `ADMIN_PORTAL_URL` to the browser-accessible admin origin.
4. List both origins in `DHAKA_INDEX_TRUSTED_ORIGINS`.
5. Store the same strong `BETTER_AUTH_SECRET` as a Worker secret on both apps.
6. Store a separate `JOB_SYNC_SECRET` on the member Worker for Cron requests.
7. Apply all remote D1 migrations before accepting registrations.
8. Register the intended owner first; that first account becomes administrator.
9. Back up D1 and apply dependency and Worker runtime updates promptly.
10. Consider placing the admin Worker behind Cloudflare Access as an additional
   layer. Application authorization is still required.

## Operator responsibility

The Cloudflare account owner controls the accounts and resumes stored in D1.
They are responsible for access controls, backups, retention, user requests,
applicable privacy notices, and applicable law. A lost authentication secret
invalidates sessions; it cannot be recovered from the repository.

## Feed availability

The feed is a convenience index rather than an authoritative employment
record. If the configured feed is unavailable, the application keeps the last
valid D1 snapshot. Users must verify every listing at its canonical URL.

The member Worker checks the configured feed every six hours. Cloudflare Cron
events and Worker logs are the operational record for scheduled refreshes.

## Hosted route health checks

Use a dedicated normal member account to exercise every authenticated member
route after deployment. Supply either its email and password or an existing
Cookie header value through local environment variables; the checker never
prints them. Email/password checks sign their temporary session out when done.

```powershell
$env:DHAKA_INDEX_HEALTH_BASE_URL = "https://your-public-app.example.workers.dev"
$env:DHAKA_INDEX_HEALTH_EMAIL = "synthetic-check@example.com"
$env:DHAKA_INDEX_HEALTH_PASSWORD = "use-a-secret-manager-value"
npm run health:hosted
```

The default run makes 20 sequential requests to Jobs, Profile, Bookmarks,
Archive, and Settings, fails on redirects/errors or Cloudflare 1102 content,
and reports p50, p95, maximum wall time, and largest response size. Requests
carry `X-Dhaka-Index-Health-Check: 1`, which forces a minimal structured timing
entry in Worker logs without recording query strings, cookies, or user data.
