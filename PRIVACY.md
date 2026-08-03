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

There is no application analytics, advertising, tracking pixel, or product
telemetry.

## Controls

Authenticated users can download a JSON export from **Settings**. They can
also permanently delete their account, resume, profile photo, sessions,
bookmarks, and archive.

The first successfully registered account is automatically assigned as the
sole administrator. Deleting that account removes the administrator assignment;
the next newly registered account becomes administrator if none exists.

## Operator responsibility

The Cloudflare account operator is responsible for the deployment's privacy
notice, retention, security, backups, and user requests.
