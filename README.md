# Dhaka Index

Dhaka Index is an experimental project exploring a focused jobs and
application toolkit for Dhaka. Try the live experiment at
[dhakaindex.com](https://dhakaindex.com).

The project combines a curated job index with resume and cover-letter tools.
Its public app and private administration service run on Cloudflare Workers and
share a Cloudflare D1 database. It is an early experiment, not a production
employment service, and its direction will be shaped by user feedback.

The public repository does **not** contain the crawler or any user data. A
private maintainer workflow publishes a sanitized CC0 snapshot containing only
job titles, companies, deadlines, and canonical application links.

## Included applications

- **Member app** — jobs, bookmarks, personal archive, account settings, resume
  builder, cover-letter builder, and PDF export.
- **Admin portal** — registered-user overview and job corrections or deletions.

Registration is open. A D1 trigger assigns the first successfully registered
account as the sole administrator; later registrations are normal member
accounts. Register the intended owner before sharing the member URL.

No existing accounts, sessions, resumes, bookmarks, or profile photos are
imported by the deployment process. New data entered after launch is stored in
the deployment's D1 database.

## Cloudflare deployment

Requirements:

- Node.js 20.9 or newer
- npm
- a Cloudflare account authenticated with Wrangler

```powershell
npm install
npx wrangler d1 create dhaka-index
Copy-Item wrangler.example.jsonc wrangler.jsonc
Copy-Item admin-portal/wrangler.example.jsonc admin-portal/wrangler.jsonc
```

Copy the returned D1 database ID into both local `wrangler.jsonc` files.
Configure the Worker origins there, then apply the schema and upload the
sanitized job snapshot. Production Wrangler files are intentionally ignored so
account-specific database IDs and private service origins are not published:

```powershell
npm run cf:migrate
npm run cf:seed-jobs
```

Generate one strong authentication secret and store the same value on both
Workers. Generate a different secret for the member Worker's scheduled feed
refresh:

```powershell
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_SECRET --config admin-portal/wrangler.jsonc
npx wrangler secret put JOB_SYNC_SECRET
```

Deploy both applications:

```powershell
npm run cf:deploy
npm run admin:cf:deploy
```

Cloudflare Browser Rendering provides authenticated PDF export. See
[docs/self-hosting.md](docs/self-hosting.md) for the complete deployment and
security checklist.

The member Worker checks the sanitized feed every six hours through a
Cloudflare Cron Trigger. An expiring D1 lease prevents scheduled and
visitor-triggered checks from running at the same time.

## Automatic deployments

The production member and administration Workers are connected to this
repository. Changes merged into `main` trigger both builds; non-production
branch builds are disabled. The Cloudflare GitHub App is limited to this
repository rather than receiving access to every repository in the account.

For another deployment, connect both Workers to the same GitHub repository
with `main` as the production branch. Add these encrypted build variables to
each Worker:

- `DHAKA_INDEX_D1_DATABASE_ID`
- `DHAKA_INDEX_PUBLIC_URL`
- `DHAKA_INDEX_ADMIN_URL`

Use the repository root for both builds. Configure the member Worker with:

```text
Build command: npm run cf:prepare-build && npm run cf:build
Deploy command: npx wrangler deploy
```

Configure the administration Worker with:

```text
Build command: npm run cf:prepare-build && npm run admin:cf:build
Deploy command: npx wrangler deploy --config admin-portal/wrangler.jsonc
```

The preparation script creates ignored, account-specific Wrangler files during
the build. Production database identifiers and private service origins remain
outside the repository.

## Job updates

The feed document uses this stable shape:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-26T12:00:00.000Z",
  "license": "CC0-1.0",
  "jobs": [
    {
      "title": "Product Designer",
      "company": "Example Ltd",
      "deadline": "2026-08-15",
      "url": "https://example.com/careers/product-designer"
    }
  ]
}
```

Successful snapshots update base job records in D1. A canonical URL missing
from a later successful snapshot is marked expired. Bookmarks, archives,
deleted-job tombstones, and administrator overrides remain intact.

The app never treats a failed download as an empty feed. It continues showing
the last successful D1 snapshot and records the error.

## Privacy

No analytics or advertising telemetry is included. The deployment does not
import pre-existing user data. Information that users enter into the hosted
app—including account credentials, resumes, bookmarks, and profile data—is
stored in Cloudflare D1 so it is available across devices.

Users can export or permanently delete their account data from **Settings**.
See [PRIVACY.md](PRIVACY.md) for the complete hosted-data model.

## Development

Apply the schema to the local D1 emulator before the first development run:

```powershell
npm run cf:migrate:local
npm run cf:seed-jobs:local
npm run dev
```

The local seeder imports the same sanitized feed used by the hosted Worker. A
signed-in local Jobs page also performs one development-only sync on mount, so
fresh local D1 state can bootstrap without a Cloudflare Cron trigger.

Use these commands for verification and deployment:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run admin:build
npm run verify
npm run cf:build
npm run admin:cf:build
```

Deterministic tests use schema fixtures and synthetic job records. The
open-source CI does not crawl external sites or use production user data.

## Project policies

- [Architecture](docs/architecture.md)
- [Self-hosting and security](docs/self-hosting.md)
- [Job data notice](DATA_NOTICE.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Trademark policy](TRADEMARKS.md)

## Licenses

Application code and documentation are licensed under
[Apache-2.0](LICENSE). The sanitized job-feed compilation is dedicated under
[CC0-1.0](DATA_LICENSE), to the extent the project has rights to do so.
Underlying job postings, company names, and linked pages remain the property
of their respective publishers.

Job information is provided on a best-effort basis. Always verify the role,
deadline, and application instructions on the linked employer page.
