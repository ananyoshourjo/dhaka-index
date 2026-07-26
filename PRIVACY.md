# Privacy

Dhaka Index is local-first software. The project maintainers do not receive
data from independently operated installations.

## Data stored by an installation

- Account name, email, password hash, and session records
- Session IP address and user agent when recorded by the authentication library
- Resume, cover letter, references, and embedded profile photo
- Bookmarked and archived job identifiers
- Administrator assignments and local job corrections
- The last valid public job snapshot and synchronization status

This information is stored in the operator's configured data directory.

## Data sent by the application

The server retrieves the configured public job-feed URL. When a user opens a
job, their browser navigates directly to the linked external site.

There is no analytics, advertising, crash-reporting, tracking pixel, or product
telemetry in v0.1.0.

## Controls

Authenticated users can download a JSON export from **Settings**. They can
also permanently delete their account, resume, profile photo, sessions,
bookmarks, and archive.

Deleting an installation's final administrator causes a new local setup code
to be generated so the first remaining registered account can establish
ownership according to the setup rules.

## Self-hosted deployments

The installation operator—not the upstream project—is responsible for that
deployment's privacy notice, retention, security, backups, and user requests.
