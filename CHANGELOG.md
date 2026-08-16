# Changelog

All notable changes are documented here.

## 1.5.0 - 2026-08-16

- Add manual job creation to the admin portal.
- Publish manually added jobs immediately while keeping them protected from feed refreshes.

## 1.4.0 - 2026-08-15

- Refresh the production job feed every 15 minutes so newly published jobs reach D1 without waiting for signed-in traffic.
- Align the signed-in fallback sync and Cloudflare deployment template with the faster autonomous refresh cadence.

## 1.3.1 - 2026-08-12

- Add an admin Trash page with recoverable soft-deleted jobs

## 1.3.0 - 2026-08-09

- Add collapsible resume editor sections and entries for compact profile editing
- Add optional Cloudflare Web Analytics with documented privacy and configuration boundaries
- Expose structured scheduled job-sync status and timing logs for Cloudflare Worker observability

## 1.2.0 - 2026-08-08

- Add rich-text editing to the summary, cover letter, bullet points, and descriptions
- Render formatted resume content safely in previews and PDF exports
- Remove redundant editor placeholders and helper labels

## 1.1.9 - 2026-08-04

- Keep the resume preview toolbar on one row on mobile

## 1.1.8 - 2026-08-04

- Replace separate resume and cover-letter download buttons with one conditional Download menu

## 1.1.7 - 2026-08-04

- Fix cover-letter PDF downloads with a dedicated download action

## 1.1.6 - 2026-08-04

- Render cover-letter names in uppercase to match resume headers.

## 1.1.5 - 2026-08-04

- Add descriptive labels to cover-letter contact details
## 1.1.4 - 2026-08-04

- Add an option to justify cover-letter body text in the preview and PDF export.

## 1.1.3 - 2026-08-04

- Make cover-letter phone, email, and LinkedIn contact details clickable

## 1.1.2 - 2026-08-03

- Remove the placeholder URL from the resume builder link field for a cleaner, consistent form.

## 1.1.1 - 2026-08-03

- Remove unintended drop shadows from shared input fields across the member and admin apps.

## 1.1.0 - 2026-08-03

- Add optional links to custom resume entries in the editor, preview, and PDF export.
- Make resume email and phone references clickable in PDF exports.

## 1.0.0 - 2026-08-03

- Launch Dhaka Index 1.0.0 on its official domain with a clear mission centered on high-quality jobs, thoughtful UX, and simplicity
- Present the built-in resume builder as a direct path from finding an opportunity to creating a professional application
- Make openness and transparency explicit across the product, privacy, contribution, and job-data story
- Serve current profile photos reliably in the admin portal and route production builds to the official admin domain

## 0.7.0 - 2026-08-02

- Add admin job search and job-function filtering with shared controls.
- Make local admin development reuse D1 state and apply shared migrations automatically.
- Harden profile-photo binary responses and refine resume selects and auto-growing bullet editors.

## 0.6.0 - 2026-08-01

- Expand the resume builder with publications, certifications, custom sections, editable titles, and flexible section ordering.
- Refresh job discovery controls, local D1 bootstrap, and shared select and navigation UI.
- Update Dhaka Index branding and improve resume PDF links, validation, and rendering.

## 0.5.0 - 2026-08-01

- Add job-function interests, search, company and function filters, sorting, and indexed pagination.
- Move profile photos into dedicated D1 storage with optimized uploads and efficient avatar and PDF delivery.
- Reduce hosted Worker load and add authenticated route health monitoring.

## 0.4.0 - 2026-07-31

- Refresh the public job feed every 30 minutes with Cloudflare Cron, independent of signed-in visitors.
- Prevent overlapping feed updates with an expiring D1 synchronization lease.
- Prepare repeatable Cloudflare Git builds for the main app and admin portal.

## 0.3.0 - 2026-07-30

- Reframe Dhaka Index as an experimental project and publish the live public demo
- Replace the local SQLite and Docker deployment contract with Cloudflare Workers and shared D1 storage
- Keep registration open while assigning the first registered account as the sole administrator
- Generate authenticated PDFs with Cloudflare Browser Rendering and seed only the sanitized public job feed

## 0.2.0 - 2026-07-30

- Refresh settings, job cards, and administrator workflows
- Make resume pagination automatic and add an administrator deadline calendar
- Deliver a mobile-friendly application with preview-local pinch and trackpad zoom
- Align administrator job cards with the main app and add protected user deletion
- Add agent-managed Semantic Versioning and automated GitHub releases

## 0.1.0

- Initial local-first multi-user job index
- Public CC0 job-feed synchronization with offline caching
- First-user administrator claim using a one-time setup code
- Separate administrator portal for users and local job corrections
- Resume and cover-letter builder with authenticated local PDF export
- Account data export and permanent deletion
- Docker and Node.js self-hosting workflows
