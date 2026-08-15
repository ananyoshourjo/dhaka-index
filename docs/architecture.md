# Architecture

## Trust boundary

Dhaka Index deliberately separates public software from private collection:

```text
private maintainer crawler
    -> selects title, company, deadline, canonical URL
    -> publishes jobs.json to the jobs-data branch
    -> member Worker downloads and validates jobs.json
    -> Cloudflare D1 base job records
    -> hosted user state and administrator overrides
```

The crawler, its credentials, source adapters, browser state, and source
diagnostics are not part of the public repository.

## Applications

The root Next.js application serves the member experience as one Cloudflare
Worker. `admin-portal` is a second Next.js application and Worker. npm
workspaces provide one dependency lockfile while preserving independent build
and runtime entry points. Both Workers bind the same D1 database.

## Authentication and ownership

Better Auth stores users, password accounts, and sessions in D1. Both Workers
must use the same `BETTER_AUTH_SECRET`.

An `AFTER INSERT` D1 trigger assigns the first successfully registered user to
the singleton `app_admins` row. The database constraint allows only one admin.
If no admin exists later, the next newly registered account receives the role.
The intended owner should therefore register before the member URL is shared.

## Feed synchronization

The main app accepts schema version 1 only. It enforces:

- HTTPS canonical links;
- valid metadata, date-only deadlines, and CC0 marker;
- unique canonical links;
- bounded document size and job count;
- a configured server-side feed URL rather than a request-supplied URL.

An ETag avoids unnecessary downloads. Sync errors update status but never
expire cached jobs. Only a fully parsed and validated snapshot is applied to
D1.

The member Worker owns a 15-minute Cron Trigger. It dispatches an authenticated
request through the generated OpenNext handler and forces an ETag-aware feed
check even when nobody is signed in. Long-lived signed-in tabs retain a
15-minute fallback, but mounting the Jobs route does not trigger another Worker
request. Both paths acquire the same expiring singleton D1 lease before fetching
or applying the feed.

Feed writes update base fields. `admin_title`, `admin_company`,
`admin_deadline_at`, `admin_deadline_override`, and `deleted_at` are
administrator overrides or tombstones and are preserved.

The member application derives one or more controlled job functions from each
listing title during synchronization. These taxonomies stay inside D1 rather
than changing the public feed contract. They power job search and filtering,
and the primary job interest collected at sign-up uses the same vocabulary so
future notifications can be matched consistently.

## Resume data and PDF generation

Resume content, cover letters, references, and photos are stored in
`resume_profiles` as JSON in D1. Photos are restricted to bounded JPEG, PNG, or
WebP data URLs, so PDF generation does not retrieve remote images.

The PDF route requires an authenticated session, limits payload size and
concurrency, and sends the generated HTML to Cloudflare Browser Rendering.

## Backup

Use Cloudflare's D1 export and recovery features according to the deployment's
retention requirements. Store the Worker authentication secret separately from
the repository and database export.
