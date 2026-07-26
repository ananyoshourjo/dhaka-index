# Self-hosting and security

Dhaka Index defaults to loopback-only listeners. A reverse proxy is required
for a network or internet deployment.

## Minimum deployment requirements

1. Use HTTPS at the reverse proxy.
2. Set `BETTER_AUTH_URL` and `ADMIN_AUTH_URL` to their public HTTPS origins.
3. Set `ADMIN_PORTAL_URL` to the browser-accessible admin origin.
4. List both origins in `DHAKA_INDEX_TRUSTED_ORIGINS`.
5. Persist and back up `DHAKA_INDEX_DATA_DIR`.
6. Complete the first-administrator claim before opening registration to an
   untrusted network.
7. Keep the admin portal behind additional network controls when possible.
8. Apply dependency and container updates promptly.

Example:

```dotenv
BETTER_AUTH_URL=https://jobs.example.com
ADMIN_AUTH_URL=https://admin.example.com
ADMIN_PORTAL_URL=https://admin.example.com
DHAKA_INDEX_TRUSTED_ORIGINS=https://jobs.example.com,https://admin.example.com
DHAKA_INDEX_DATA_DIR=/var/lib/dhaka-index
DHAKA_INDEX_JOB_FEED_URL=https://raw.githubusercontent.com/ananyoshourjo/dhaka-index/jobs-data/jobs.json
```

## Operator responsibility

The person operating an installation controls the accounts and resumes stored
there. They are responsible for access controls, backups, retention, user
requests, applicable privacy notices, and applicable law.

The project does not provide a hosted service and cannot recover a lost local
database, password, administrator code, or authentication secret.

## Feed availability

The feed is a convenience index rather than an authoritative employment
record. If GitHub or the configured feed is unavailable, the application keeps
the last valid snapshot. Users must verify every listing at its canonical URL.
