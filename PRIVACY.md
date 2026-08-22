# Privacy

Openness starts with being clear about personal data. Dhaka Index is a hosted
jobs and resume-building service operated in a Cloudflare account. No existing
user database is imported during deployment. Data entered by users after
launch is stored in the deployment's Cloudflare D1 database.

## Data stored by the hosted application

- Account name, email, preferred job function, password hash, and session records
- Session IP address and user agent when recorded by the authentication library
- Resume, cover letter, references, and embedded profile photo
- Bookmarked and archived job identifiers
- Administrator assignments and job corrections
- The last valid public job snapshot, derived job functions, and synchronization status

Cloudflare processes and stores this information as the hosting and database
provider. Operators with access to the Cloudflare account can administer the
deployment and database.

## Data sent by the application

The server retrieves the configured public job-feed URL. When a user opens a
job, their browser navigates directly to that external site. Authenticated PDF
generation is processed by Cloudflare Browser Rendering.

When enabled, the public member app uses Cloudflare Web Analytics for baseline
page-view and real-user performance measurement. The application does not send
account credentials, resumes, cover letters, profile photos, bookmarks, or D1
records to the analytics beacon. The private admin portal does not include the
beacon. Cloudflare Web Analytics is configured either through Cloudflare's
automatic setup or the repository's public site-token build variable, not both.

When separately configured, the member app uses PostHog for product analytics.
It sends manually defined events for safe route names, onboarding outcomes, job
search metadata, job actions, resume milestones, settings outcomes, sanitized
error categories, and Web Vitals. Signed-in events use the account's opaque
internal ID. The app does not send names, email addresses, passwords, resume or
cover-letter content, profile-photo content, raw searches, raw URLs, referrers,
exception messages, or stack traces. DOM autocapture, session replay, heatmaps,
surveys, feature flags, and automatic exception capture are disabled. PostHog is
not loaded by the private admin portal. The operator must configure the PostHog
project to discard IP data and select an appropriate retention period.

Cloudflare Worker Observability separately receives structured technical health
data such as request failures, slow requests, health-check traces, and
scheduled job-sync results for operator diagnosis. This data is not exposed as
visitor analytics.

## Controls

Authenticated users can download a JSON export from **Settings**. They can
also permanently delete their account, resume, profile photo, sessions,
bookmarks, and archive.

Deleting an account records the deletion outcome, clears the browser's PostHog
identity, and removes the application's mapping from the opaque analytics ID to
the deleted account. Previously collected analytics events remain subject to the
PostHog project's retention and operator-managed deletion controls.

The first successfully registered account is automatically assigned as the
sole administrator. Deleting that account removes the administrator assignment;
the next newly registered account becomes administrator if none exists.

## Operator responsibility

The Cloudflare account operator is responsible for the deployment's privacy
notice, retention, security, backups, and user requests.
