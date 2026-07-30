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
6. Apply all remote D1 migrations before accepting registrations.
7. Register the intended owner first; that first account becomes administrator.
8. Back up D1 and apply dependency and Worker runtime updates promptly.
9. Consider placing the admin Worker behind Cloudflare Access as an additional
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
