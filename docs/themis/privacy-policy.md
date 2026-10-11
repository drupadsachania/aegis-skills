# Privacy policy

Last reviewed: 2026-10-11. This page describes what the Aegis and Themis website, the hosted Aegis MCP server, and the Themis software do with data. It is written from the code in this repository. It is not legal advice. The terms for using the website and the hosted MCP server are at [Terms of Service](/terms).

Contact for privacy questions: for non-sensitive questions, open an issue at <https://github.com/drupadsachania/aegis-skills/issues>. For anything sensitive, use GitHub private vulnerability reporting at <https://github.com/drupadsachania/aegis-skills/security/advisories/new>. A Kairos Foundation role mailbox for privacy questions will be added to this policy when one exists.

## Summary

- The website and the hosted MCP server have no accounts, no cookies, no analytics and no database. The hosted MCP server makes no model calls.
- The Themis software keeps its data on your machine. It sends data off your machine only to the model provider and the MCP servers that you configure.
- Aegis and Themis do not sell data and do not send telemetry.

## The website

The website is a static site with a few read-only API routes. Its code writes no records about visitors. It sets no cookies and runs no analytics or tracking scripts. The only thing it stores in your browser is your light or dark theme choice, kept in your browser's local storage under a theme key; it never leaves your browser and the site works without it.

Two things happen outside our code:

- **Fonts.** Pages load web fonts from Adobe Fonts (`use.typekit.net` and `p.typekit.net`). Your browser therefore sends a request to Adobe, and Adobe receives your IP address and browser user agent, plus the address of our site (not the full address of the page you are on), as part of serving the fonts and counting kit usage. Adobe's own privacy policy applies to that request: <https://www.adobe.com/privacy.html>. The monospace font (Red Hat Mono) is served from our own origin, and no other third party is contacted for fonts.
- **Hosting.** The site is served by its hosting platform, which keeps its own standard request logs (for example IP address, time and requested path) under its own retention rules. Our code does not read or export those logs, and we do not control their retention. <!-- USER: confirm the hosting platform's log retention and add it here if you want it stated -->

## The hosted Aegis MCP server

The hosted server is the route `/api/mcp` on the website. It has three tools: `list_skills`, `get_skill` and `get_skill_phase`. Each one is read-only and returns public skill text that is also published on the website.

What the code does with a request:

- It handles each request on its own, with no session and no shared state: a fresh server object is created for the request and closed when the response is made.
- It keeps a short-lived request counter in the memory of the running server instance to slow down bursts from one client (120 requests a minute per IP address taken from the `x-forwarded-for` header). The counter is never written to disk, never logged and never shared, and it disappears when the instance restarts.
- It stores nothing else. It writes no database record, no file and no log line of its own, and there is no account, token or credential involved.
- It makes no model calls and holds no model keys. A test (`apps/web/tests/guard/no-model-deps.test.js`) fails if the website declares or imports model packages, reads secrets from the environment, references a removed route, or brings back the telemetry module or the removed routes.
- It rejects bodies over 64 KB, validates tool arguments against a strict schema, and sends `Cache-Control: no-store` so responses are not cached.

What it receives: the MCP request itself (the tool name and the arguments you or your AI client chose, such as a skill name) and the usual network metadata that any web server sees. As described above, the hosting platform may log that metadata. Please do not put personal data or secrets into tool arguments; the tools do not need them.

## Themis in plugin mode (Mode 1)

The plugin runs on your machine, inside your own AI client. It stores run state, the audit log and approval records locally in `~/.themis/themis.db` (or the folder named by `THEMIS_HOME`). It sends no telemetry. The model that does the reasoning is the one your AI client uses, and your client's provider terms apply to what it sees. If you connect external MCP servers through Themis, calls to those servers go where you configured them.

## Themis standalone app (Mode 2)

The app keeps its data in `~/.themis/` on your machine: the database with runs, audit events, approvals and reports; a settings file; and, if you choose to save one, a key file. The dashboard listens on 127.0.0.1 only and sets one session cookie, scoped to that local address, to identify your browser to the local server; it carries no personal data and is not sent anywhere else. The app sends data off your machine in two cases only:

- **Your chosen model provider.** Task text and sub-task context are sent to the provider you configure so that it can produce the analysis. Secrets and email addresses are redacted from tool arguments, results, approvals, audit data, findings and reports, but redaction is pattern based, so avoid putting secrets in task text. The provider's own terms govern what it does with the data.
- **MCP servers you configure.** Calls to those servers go to the addresses you set. Their output is redacted, shortened and treated as untrusted before use.

## Retention and deletion

Local data stays until you delete it: remove `~/.themis/` (or your `THEMIS_HOME` folder) to delete everything the software stored. We hold no copy. The hosted server stores nothing to delete; request logs kept by the hosting platform follow that platform's rules.

## Children

These tools are for security professionals and are not directed at children.

## Changes

If this policy changes, the date at the top changes and the change is visible in the repository history.
