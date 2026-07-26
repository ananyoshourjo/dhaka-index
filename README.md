# Dhaka Index

Dhaka Index is a local-first, multi-user web application for browsing a
curated index of Dhaka job openings and building polished resumes and cover
letters. It stores accounts, bookmarks, local job corrections, and resume data
inside the installation's own SQLite database.

The public repository does **not** contain a crawler. A private maintainer
workflow publishes a sanitized CC0 snapshot containing only job titles,
companies, deadlines, and canonical application links. Each installation
checks that feed at startup and every six hours, then keeps the last successful
snapshot for offline use.

## Included applications

- **Web app (`:3000`)** — jobs, bookmarks, personal archive, account settings,
  resume builder, cover-letter builder, and PDF export.
- **Admin portal (`:3010`)** — registered-user overview and local job
  corrections or deletions.

Both applications use the same local SQLite database. Admin changes are local
overrides and are never uploaded.

## Quick start with Node.js

Requirements:

- Node.js 20.9 or newer
- npm

```powershell
git clone <repository-url>
cd dhaka-index
Copy-Item .env.example .env.local
npm install
npm run setup
npm run dev
```

Open `http://127.0.0.1:3000`. The server prints a one-time administrator code
on first launch. The first registered user must enter it to become the
installation owner.

Run the admin portal in another terminal:

```powershell
npm run admin:dev
```

Then open `http://127.0.0.1:3010` and sign in with the administrator account.

The default feed comes from the repository's `jobs-data` branch. Operators may
set `DHAKA_INDEX_JOB_FEED_URL` to another compatible schema-v1 feed.

## Docker

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The named `dhaka-index-data` volume contains every account, session, resume,
bookmark, administrator assignment, local job override, and cached job
snapshot. Back up that volume as you would any personal database.

Read [docs/self-hosting.md](docs/self-hosting.md) before exposing either
application beyond the local machine.

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

Successful snapshots update base job records. A canonical URL missing from a
later successful snapshot is marked expired locally. Bookmarks, archives,
deleted-job tombstones, and administrator overrides remain intact.

The app never treats a failed download as an empty feed. It continues showing
the last successful local snapshot and displays the error.

## Privacy

No telemetry is included. The application does not upload:

- names, email addresses, password hashes, or sessions;
- resumes, cover letters, references, or profile photos;
- bookmarks, personal archives, or local administrator changes;
- SQLite databases, logs, or generated PDFs.

Users can export or permanently delete their account data from **Settings**.
See [PRIVACY.md](PRIVACY.md) for the complete local-data model.

## Development

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run admin:build
npm run verify
```

Deterministic tests use temporary databases and synthetic job records. The
open-source CI does not crawl external sites.

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
