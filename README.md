# Aegis · Themis

**Defensive cybersecurity skills for your AI, and a governed security-operations agent built on them.**

[![License: Apache-2.0 OR MIT](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](#license)

Two products, one repository:

| | Aegis | Themis |
|---|---|---|
| **What** | 24 security skills, an installer and a read-only MCP server | A security-operations agent that plans, fans out to Aegis skills, checks every output and writes a version-stamped report |
| **Calls a model?** | Never. It is markdown and JSON | Uses your assistant (plugin) or your own key or a local model (standalone) |
| **Package** | `aegis-skills` | `@aegis-skills/themis-plugin` and `@aegis-skills/themis` |

Status: nothing is published to npm or the plugin marketplace yet. The commands below that use `npx` or `/plugin` work after the first release. The [website](https://aegis-skills.vercel.app) works today.

---

## Aegis

Defensive security skills in the open [Agent Skills](https://agentskills.io/specification) format. One source installs natively into coding assistants, is served over the Model Context Protocol, and flattens into a single-file prompt for any chat AI.

### Skill library: 24 skills across 5 families

| Family | Skills |
|---|---|
| **Frameworks** | `mitre-attack` · `mitre-atlas` · `mitre-engage` |
| **Threat Intel** | `attack-surface-mapping` · `exposure-validation` · `threat-hunting` · `threat-intel-synthesis` · `threat-modeling` |
| **Response & Analysis** | `digital-forensics` · `malware-analysis` · `reverse-engineering` · `security-operations` |
| **Domain Defence** | `application-security` · `data-loss-prevention` · `deception-engineering` · `endpoint-security` · `identity-access-management` · `infrastructure-security` · `network-security` · `operational-technology` |
| **Governance & Risk** | `compliance` · `governance` · `risk-management` · `security-documentation` |

Each skill is a workflow of phases (methodology references) plus a live-threat-intel phase. Skill content is updated monthly. Browse them at [aegis-skills.vercel.app](https://aegis-skills.vercel.app/skills).

### Quick start

```bash
# Install the skills into your tool's native skills folder and register the MCP server
npx aegis-skills install --platform claude      # codex | gemini | cursor | vscode | antigravity | all
npx aegis-skills install --platform claude --project   # this project only

# Serve the whole library over MCP on stdio
npx aegis-skills mcp
```

Claude Code plugin: `/plugin marketplace add drupadsachania/aegis-skills`, then `/plugin install aegis@aegis-skills`.

Needs Node.js 24 or later.

### CLI commands

| Command | What it does |
|---|---|
| `aegis install [--platform <id>] [--project]` | Copy the skills into each tool's native folder and register the MCP server (config files are backed up first). `init` is an alias |
| `aegis uninstall [--platform <id>] [--project]` | Remove only what Aegis installed; edited files are kept as `.bak` |
| `aegis update` | Re-sync every recorded install with the installed version |
| `aegis list [--json]` | Bundled skills and recorded installs |
| `aegis mcp` | Serve the skill library over MCP on stdio |

Installed skills refresh automatically after an upgrade; set `AEGIS_NO_AUTO_REFRESH=1` to turn that off.

### Using a skill without installing

Every skill page on the website offers a single-file prompt (all phases flattened, stamped "Intel as of <date>") and a skill zip, and the whole library is available from the hosted MCP server. Build the prompts locally with `npm run build:prompts` (written to `dist/prompts/`, not committed).

### MCP

Three read-only tools are offered: `list_skills`, `get_skill`, `get_skill_phase`. They serve public skill content only and never call a model.

```json
{
  "mcpServers": {
    "aegis": { "command": "npx", "args": ["-y", "aegis-skills", "mcp"] }
  }
}
```

Hosted, with nothing to install (Streamable HTTP, no authentication): `https://aegis-skills.vercel.app/api/mcp`.

---

## Themis

Give Themis a task such as "validate exposure to CVE-2026-12345 on our VPN gateways". It runs a fixed seven-step workflow: validate, decompose, schedule, fan out to Aegis skills, guardrail, synthesise and audit. Deterministic steps are plain code in `themis-core`; reasoning steps are done by a model.

| | Themis on your AI | Themis standalone |
|---|---|---|
| **Model** | Your assistant (Claude Code, Codex, Gemini CLI) | Your Anthropic, OpenAI or Gemini key, or a local model (Ollama, LM Studio) |
| **Interface** | Your assistant's chat, through the `themis-mcp` MCP server | A local web dashboard on 127.0.0.1 |
| **Approvals** | Your client's MCP elicitation prompt, otherwise handed back to you | The dashboard's Approvals page |
| **Install** | `/plugin install themis@aegis-skills` or an MCP config | `npx @aegis-skills/themis dashboard` |

Governance is enforced in code, not by the model:

- External tools are classified read, write or execute. Reads run within a call budget; writes and executes become approval requests that only a human can approve.
- Access is default-deny: a server is reachable only by the skills in its `allowedSkills`.
- Secrets are redacted, tool output is size-capped and wrapped as untrusted, and every step, call and decision goes to a local audit log in `~/.themis`.
- In plugin mode, tools you connect directly to your assistant bypass Themis and are not governed.

Read more: [Themis docs](https://aegis-skills.vercel.app/docs/themis) and [`docs/themis`](docs/themis).

---

## Links

- Website: https://aegis-skills.vercel.app
- Choose your path: https://aegis-skills.vercel.app/paths
- Docs: https://aegis-skills.vercel.app/docs
- Hosted MCP: https://aegis-skills.vercel.app/mcp
- Security: [SECURITY.md](SECURITY.md)
- License: [LICENSE](LICENSE)

---

## Development

```bash
npm install
npm run dev                         # http://localhost:3000
npx jest                            # tests for every package
npm run build                       # production build
npm run check:deps                  # dependency guards
node scripts/check-layout.js        # layout guard
npm run lint:skills                 # skill format lint
```

See [`docs/web/development.md`](docs/web/development.md). Requires Node.js 24 or later.

## Project structure

```
├── apps/web/            # the website: catalogue, docs hub, downloads, hosted MCP (no model calls)
├── packages/
│   ├── aegis/           # aegis-skills: 24 skills, installer CLI, MCP server
│   ├── themis-core/     # deterministic workflow, redaction, approvals, local store
│   ├── themis-gateway/  # governed MCP client for external tools
│   ├── themis-plugin/   # Themis on your AI (MCP server, orchestrator skill, agents)
│   └── themis-app/      # Themis standalone (CLI and local dashboard)
├── scripts/             # repo scripts: lint, guards, prompt builder
├── docs/{aegis,themis,web}/   # user documentation, published by the website
└── .claude-plugin/      # Claude Code marketplace manifest
```

## License

Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or [MIT license](LICENSE-MIT) at your option (SPDX: `Apache-2.0 OR MIT`). See [LICENSE](LICENSE) and, for reporting vulnerabilities, [SECURITY.md](SECURITY.md).
