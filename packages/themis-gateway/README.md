# @aegis-skills/themis-gateway

The governed MCP client of Themis, a security-operations agent built on the [Aegis](https://www.npmjs.com/package/aegis-skills) skill pack. Every external tool call Themis makes goes through this gateway. It enforces an allow-list of tools, classifies each tool as read, write or execute, applies call budgets, redacts secrets, wraps tool output as untrusted data so it cannot pose as instructions, and turns anything that writes or executes into an approval request that only a human can approve.

**Status: internal library, pre-1.0.** This package exists so that the Themis plugin and the standalone Themis app share one gateway. Its API is not a public contract and can change in any 0.x release. Themis itself is still in development and is not released yet. Pin an exact version if you depend on this package. The gateway reduces risk but is not a security boundary on its own: a tool connected straight to your assistant, outside the gateway, is not governed.

## What it exports

From the package root (`dist/index.js`, with types in `dist/index.d.ts`):

- `createGateway(options)` and the `Gateway`, `GatewayOptions`, `GatewayResult` and `GovernedTool` types;
- `governedName`, `wrapUntrusted`, `neutraliseWrapperTags` and `MAX_OUTPUT_CHARS`, the helpers for naming tools and wrapping their output;
- `listServerTools`, `callServerTool` and `defaultConnector` (with the `McpConnector` and `CallOutcome` types), a thin client over the official MCP SDK.

## Requirements

Node.js 24 or later. It depends on [`@aegis-skills/themis-core`](https://www.npmjs.com/package/@aegis-skills/themis-core) and `@modelcontextprotocol/sdk`; there are no native modules.

```bash
npm install @aegis-skills/themis-gateway
```

## Licence

`(Apache-2.0 OR MIT)`: use it under either licence. See `LICENSE`, `LICENSE-APACHE` and `LICENSE-MIT` in this package.

Source, issues and security reports: <https://github.com/drupadsachania/aegis-skills/tree/main/packages/themis-gateway>
