# Architecture

## Trust boundary

Dhaka Index deliberately separates public software from private collection:

```text
private maintainer crawler
    -> selects title, company, deadline, canonical URL
    -> publishes jobs.json to the jobs-data branch
    -> public installation downloads and validates jobs.json
    -> local SQLite base job records
    -> local user state and administrator overrides
```

The crawler, its credentials, source adapters, browser state, and source
diagnostics are not part of the public repository.

## Applications

The root Next.js application serves the member experience on port 3000.
`admin-portal` is a second Next.js application on port 3010. npm workspaces
provide one dependency lockfile while preserving independent build and runtime
entry points.

Both applications open `data/dhaka-index.db` in WAL mode. Set
`DHAKA_INDEX_DATA_DIR` when the data directory must live elsewhere.

## Authentication and ownership

Better Auth stores users, password accounts, and sessions in SQLite. A random
shared secret is generated at `data/auth-secret` unless
`BETTER_AUTH_SECRET` is configured.

When no administrator exists, the main app creates
`data/initial-admin-code.txt` and prints the same one-time code to the server
console. Only the first registered user can claim it. Claiming the code creates
an `app_admins` row and removes both the code file and stored code hash.

This prevents a newly exposed installation from silently assigning admin
rights to an arbitrary registration. Operators should still complete setup
before exposing the service.

## Feed synchronization

The main app accepts schema version 1 only. It enforces:

- HTTPS canonical links;
- valid metadata, date-only deadlines, and CC0 marker;
- unique canonical links;
- bounded document size and job count;
- a configured server-side feed URL rather than a request-supplied URL.

An ETag avoids unnecessary downloads. Sync errors update status but never
expire cached jobs. Only a fully parsed and validated snapshot is applied
inside a SQLite transaction.

Feed writes update base fields. `admin_title`, `admin_company`,
`admin_deadline_at`, `admin_deadline_override`, and `deleted_at` are local
overrides or tombstones and are preserved.

## Resume data and PDF generation

Resume content, cover letters, references, and photos are stored in
`resume_profiles` as local JSON. Photos are restricted to bounded JPEG, PNG, or
WebP data URLs, so PDF generation does not retrieve remote images.

The PDF route requires an authenticated session, limits payload size and
concurrency, disables page JavaScript, blocks network requests, and closes its
headless browser after every request.

## Backup

Stop both applications before making a filesystem-level SQLite backup, or use
SQLite's supported online backup tooling. Preserve the complete data directory,
including the database and generated auth secret.
