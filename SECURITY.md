# Security policy

## Supported version

Security fixes are provided for the latest tagged release.

## Reporting

Do not open a public issue for a vulnerability involving authentication,
authorization, private data, feed validation, or arbitrary network/file
access. Use GitHub's private vulnerability reporting feature for this
repository.

Include:

- affected version and installation mode;
- reproduction steps or a minimal proof of concept;
- impact and any known mitigations;
- whether private data or credentials may have been exposed.

Do not access data belonging to other users while investigating.

## Operational security

Self-hosters are responsible for HTTPS, reverse-proxy configuration, data
directory permissions, backups, dependency updates, and access to the admin
portal. See [docs/self-hosting.md](docs/self-hosting.md).
