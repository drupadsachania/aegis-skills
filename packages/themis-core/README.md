# @aegis-skills/themis-core

The deterministic engine of Themis, a security-operations agent built on the [Aegis](https://www.npmjs.com/package/aegis-skills) skill pack. It holds the parts of Themis that must behave the same every time and that no language model decides: the workflow definition, policy, secret redaction, input sanitising, risk scoring, approval records, the audit log and the local store. It contains no LLM calls and makes no network requests.

**Status: internal library, pre-1.0.** This package exists so that the Themis plugin and the standalone Themis app share one engine. Its API is not a public contract and can change in any 0.x release. Themis itself is still in development and is not released yet. Pin an exact version if you depend on this package, and read the changelog of the repository before you upgrade.

## What it exports

Everything is exported from the package root (`dist/index.js`, with TypeScript types in `dist/index.d.ts`):

- the shared types and contracts (workflow steps, requests, approvals, reports);
- secret detection and redaction (`redact`, `secrets`) and input sanitising (`sanitise`);
- MCP server configuration and the read, write or execute tool policy;
- exposure and audit scoring: risk, detection, verification and the planner, correlation and report rules;
- the approval and audit-log primitives, the workflow definition and the local SQLite store (built on `node:sqlite`);
- `versionStamp`, which records the Themis, Aegis and skill-format versions in every report.

## Requirements

Node.js 24 or later. There are no native modules and no build tools are needed to install it.

```bash
npm install @aegis-skills/themis-core
```

## Related packages

- [`@aegis-skills/themis-gateway`](https://www.npmjs.com/package/@aegis-skills/themis-gateway): the governed MCP client that sits on top of this package.
- [`aegis-skills`](https://www.npmjs.com/package/aegis-skills): the 24 defensive security skills, with an installer and a read-only MCP server. This is the released product today.

## Licence

`(Apache-2.0 OR MIT)`: use it under either licence. See `LICENSE`, `LICENSE-APACHE` and `LICENSE-MIT` in this package.

Source, issues and security reports: <https://github.com/drupadsachania/aegis-skills/tree/main/packages/themis-core>
