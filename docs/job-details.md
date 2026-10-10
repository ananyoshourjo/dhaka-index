# Internal job pages

Job cards open `/<company>-<job-title>-<id>` in Dhaka Index. Old `/jobs/<id>`
links redirect permanently to the canonical descriptive URL. The page includes the employer’s
description, deadline, job categories and application instructions. Descriptions
are normalized into headings, paragraphs, lists and inline emphasis rendered by
React; source HTML, scripts and forms are never embedded. Original listings are
not linked. The flat page uses dividing lines and a copy-link action.

The primary action uses the separately collected application destination.
Email applications open the specified address. Portals requiring authentication
use their actual candidate login link, retaining any published return-to-job
parameters. The button always says “Apply” and sits below the date. An unavailable destination does not
fall back to a description page under an Apply label. Closed jobs disable applying.

Migration `0007_job_descriptions.sql` adds nullable description, application URL,
instructions and capture timestamp fields without replacing job identities or
user bookmarks. Job-detail pages are shareable and include role-specific metadata;
deleted jobs and invalid IDs return the normal not-found page.

The existing schemaVersion1 feed adds optional `description`, `applyUrl`,
`applicationInstructions` and `contentCheckedAt` fields. Older four-field feeds
remain readable. Both visitor/Cron import and the supported seed preserve these
fields. Application URLs allow HTTPS or a single email recipient; unsafe schemes
and credential-bearing URLs are rejected. Application fragments are preserved.

Descriptions use readable headings and complete bullet points. Application
controls, navigation, contact promotions and cookie text are removed from older
captures as well as new content. Interview stages appear under Hiring process,
separate from application instructions. Descriptions and instructions are not
cut at a character boundary.

The private crawler rewrites collected descriptions using the locally installed
Codex CLI and its existing sign-in. Each rewrite is saved privately under a hash
of the source text and editing instructions. Unchanged content reuses that file;
page requests never launch Codex. There is no score, review, schema validation or
approval stage for a rewrite. If Codex is unavailable, cleaned employer text is
saved and collection continues. To regenerate, change the editing instructions
or remove the relevant cached Markdown file. `content:refresh -- --normalize-stored`
rewrites existing captures; `--job-id=<crawler-id>` limits the operation to one job.
`DHAKA_INDEX_CODEX_BIN` optionally selects a native Codex executable.

Publication no longer waits for a catalogue audit or complete description
capture coverage. Unreviewed categories use the existing title classifier.
Application-URL security, source availability, import size limits and concurrent
write locks remain independent of description editing.

The private crawler owns collection and source evidence. Its locked
`content:refresh` stage follows advert intermediaries, collects employer text and
application/login destinations, and records unresolved cases explicitly. Only
sanitized job content is published; crawler implementation, captured pages,
backups and database records remain private. Admin manual entry also accepts
descriptions and application/login URLs.

The supported seed imports descriptions in UTF-8 byte-bounded SQL batches,
sharing the visitor/Cron synchronization lease and committing the feed timestamp
only after all batches succeed. The publisher retains its large-drop guard for
feeds larger than GitHub's inline Contents response limit.
