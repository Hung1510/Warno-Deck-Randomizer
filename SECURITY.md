# Security Policy

## Reporting a vulnerability

If you find a security issue, please **do not open a public issue**. Instead, use
GitHub's private reporting:

1. Go to the **Security** tab of this repository.
2. Click **Report a vulnerability** (GitHub Private Vulnerability Reporting).

Alternatively, open a regular issue that only says "security — please contact me"
without details, and we'll arrange a private channel.

Please include, where possible: a description, reproduction steps, affected
version/commit, and impact. We aim to acknowledge reports within a few days.

## Supported versions

This is a hobby project; only the latest `main` is supported.

## Hardening already in place

- **HTTP security headers** via [`helmet`](https://helmetjs.github.io/) on the API and
  a matching Content-Security-Policy for the static site (see `vercel.json`).
- **Rate limiting** on `/api` (120 requests/minute/IP) via `express-rate-limit`.
- **Body size limit** (`64kb`) on JSON requests.
- No secrets in the repo: `.env` and friends are git-ignored. The app needs no API keys.
- Dependency review via the CI workflow and Dependabot (enable in repo settings).

## Notes

WARNO and all related unit/division data belong to **Eugen Systems**. Data sourced from
the WARNO Fandom wiki is licensed CC-BY-SA. This project is fan-made and unofficial.
