# Changelog

All notable changes are documented here.

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
