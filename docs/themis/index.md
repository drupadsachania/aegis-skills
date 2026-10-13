# Themis

## What Themis is

Themis is a security-operations agent built on [Aegis](../aegis/index.md). You give it a task, such as "validate exposure to CVE-2026-12345 on our VPN gateways". It plans the work, fans it out to specialist Aegis skills, checks every output, and writes a report stamped with the exact Themis and Aegis versions it used.

Everything that touches an outside tool goes through a governed gateway: reads are budgeted and audited, and anything that writes or executes waits for a human.

Status: in development. Themis is local-first and still being matured. The plugin (1.1.0) and the standalone app (0.1.0) are built and tested in the repository and can be run from a checkout today (see [Themis standalone](./mode-2-app.md) and [Themis on your AI](./mode-1-plugin.md)). They are not published to npm or to AI directories yet. Aegis is released first; Themis distribution through directories is planned for a later milestone, once its tool contract is stable and a supported remote endpoint exists. These are plans, not promises, and carry no dates.

## Two modes

| | Themis on your AI | Themis standalone |
|---|---|---|
| Where the model runs | Your assistant (Claude Code, Codex, Gemini CLI) | Your API key (Anthropic, OpenAI, Gemini) or a local model (Ollama, LM Studio) |
| API key needed | No | Yes, or a local model |
| Interface | Your assistant's chat | Local web dashboard on 127.0.0.1 |
| Orchestration | Your assistant runs each step, guided by the Themis skill | LangGraph runs the same workflow definition |
| Approvals | Asked through your client's own prompt when it supports MCP elicitation; otherwise handed back for you to run | Approvals page in the dashboard |
| Tool governance | Tools you register with Themis are governed; tools connected straight to your assistant are not | Every tool call is governed |
| History and audit | Local SQLite in ~/.themis | Local SQLite in ~/.themis |
| Install | An MCP config (a marketplace listing is planned) | npx @aegis-skills/themis dashboard |

## Packages

- `@aegis-skills/themis-core` (0.1.0) is deterministic code with no model: the workflow definition, validation, redaction, approval rules and the local store.
- `@aegis-skills/themis-gateway` (0.1.0) is the governed MCP client that every external tool call passes through.
- `@aegis-skills/themis-plugin` (1.1.0) is mode 1, an MCP server with the bin `themis-mcp`.
- `@aegis-skills/themis` (0.1.0) is mode 2, with the bin `themis`.

## Next steps

- [Themis on your AI](./mode-1-plugin.md)
- [Themis standalone](./mode-2-app.md)
- [Governance and approvals](./governance.md)
- [Workflow](./workflow.md)
- [Configuration](./configuration.md)
- [Versions and compatibility](./versions.md)
- [Compliance mapping](./compliance-mapping.md)
- [Threat model (MITRE ATLAS)](./threat-model-atlas.md)
- [Privacy policy](./privacy-policy.md)
- [Reviewer test prompts](./test-prompts.md)
