# Security

Landed is a locally run application: the packaged installation starts Next.js and PostgreSQL in Docker on your own computer, and there is no hosted service, account system or telemetry. The web port is published only on 127.0.0.1, and the database has no host port. Your career data stays in the local Docker volume (and in any backups you make); do not expose the port beyond loopback, for example by editing the `ports` entry in `compose.release.yml`, without a separate access and security design.

An optional model provider key (Phase 1b) lives only in `.env.release` (or `.env` for contributors). It is never written to the database, never included in backups, never sent to the browser and never logged; the Settings column shows at most its last characters. When a provider is configured, the web service sends your career facts and the pasted posting to that provider over HTTPS and to nothing else. The only other outbound request is one you start: pasting an image address for a job's logo fetches that address once (https only, private networks refused, one megabyte, ten seconds) and keeps a copy with the job, so the page never loads images from other sites. With no provider configured and no address pasted, the service makes no outbound requests.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately through GitHub's private vulnerability reporting on the repository at https://github.com/3333444n/landed (Security tab, "Report a vulnerability"), or contact the maintainer through the GitHub profile linked there.

Include what the problem is, which files or routes are involved, steps to reproduce it, the version or commit you tested, and what impact you believe it has. Sanitize any example data; never send a real profile, backup or `.env.release`.

## What to expect

This project has a solo maintainer. Reports are read and acknowledged on a best-effort basis, usually within a couple of weeks, and fixes ship as ordinary commits once verified. Because the application runs only on your machine, the practical risk of most issues is limited to your own installation; nevertheless, treat imported job postings and pasted text as untrusted data, keep your backups private, and update by pulling the repository and running `sh scripts/landed.sh start` again.
