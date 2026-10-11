# The website

## What it hosts

The Aegis and Themis website at https://aegis-skills.vercel.app hosts:

- the [skill catalogue](/skills), with a page for each of the 24 skills;
- single-file prompts and skill zips for every skill (see [Downloads](./downloads.md));
- the hosted, read-only Aegis MCP server (see [Hosted MCP](./hosted-mcp.md));
- these docs, rendered from the `docs/` folder of the repository;
- a small read-only HTTP API (see [API](./api.md)).

## What it doesn't do

The site makes no model calls and has no accounts, cookies, analytics or database. It is built statically at deploy time; the only code that runs per request is the read-only API and the MCP endpoint. Vercel's standard platform request logs still apply.

## Security headers

Every response carries these headers (from `apps/web/next.config.js`):

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'` |

Files under `/downloads/` also send `Cache-Control: public, max-age=3600, must-revalidate`.

## Source

The site lives in `apps/web` in the repository and is deployed on Vercel at https://aegis-skills.vercel.app. To work on it, see [Developing the website](./development.md).
