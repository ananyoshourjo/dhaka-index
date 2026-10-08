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
