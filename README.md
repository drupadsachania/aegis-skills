# Themis · Aegis

**Platform-agnostic AI skill compiler and multi-agent threat analysis — built for defenders.**

Two subsystems, one deployment:

| | Aegis | Themis |
|---|---|---|
| **What** | Skill compiler + marketplace + MCP server | LangGraph orchestrator |
| **Does** | Write once → deploy to any AI platform | Fan-out parallel threat analysis |
| **Format** | SKILL.md → system prompt / ChatGPT Action / MCP | POST request → structured findings report |

---

## Aegis

Author defensive security skills in a single `SKILL.md` file. Aegis compiles it to every platform format — one source, deployed everywhere — and serves the whole library over the Model Context Protocol.

### Skill library — 24 skills across 5 families

| Family | Skills |
|---|---|
| **Frameworks** | `mitre-attack` · `mitre-atlas` · `mitre-engage` |
| **Threat Intel** | `attack-surface-mapping` · `exposure-validation` · `threat-hunting` · `threat-intel-synthesis` · `threat-modeling` |
| **Response & Analysis** | `digital-forensics` · `malware-analysis` · `reverse-engineering` · `security-operations` |
| **Domain Defence** | `application-security` · `data-loss-prevention` · `deception-engineering` · `endpoint-security` · `identity-access-management` · `infrastructure-security` · `network-security` · `operational-technology` |
| **Governance & Risk** | `compliance` · `governance` · `risk-management` · `security-documentation` |

Each skill is a workflow of phases (methodology references) plus a weekly auto-refreshed live-threat-intel feed. Browse them at [aegis-skills.vercel.app](https://aegis-skills.vercel.app/).

### Quick start

```bash
# Install the CLI
npm install -g @aegis-skills/core

# Detect your tools and wire the skills in
aegis init

# Serve the whole library to Claude / Cursor over MCP (see MCP section below)
aegis mcp
```

### CLI commands

| Command | What it does |
|---|---|
| `aegis init` | Detect installed AI tools and inject skill manifests + system prompts |
| `aegis list` | Show installed skills and their status per tool |
| `aegis compile [skill]` | Rebuild artifacts from SKILL.md (system prompt, MCP manifest, OpenAI action) |
| `aegis intel-sync` | Ingest a threat-intel corpus and route it into the skills it affects |
| `aegis mcp` | Serve the skill library over MCP on stdio for MCP clients |

### Deploying a skill

After compilation, three artifacts are generated in `skills/<name>/artifacts/`:

- `system-prompt.txt` — paste into Claude Projects, Gemini Gems, or any chat UI
- `openai-action.json` — import into ChatGPT GPT Builder → Add Action
- `mcp-manifest.json` — the legacy static descriptor (prefer the live MCP server below for Claude Desktop / Cursor)

---

## MCP (Model Context Protocol)

Aegis speaks MCP in both directions.

### Serve Aegis skills to an MCP client

Expose the library to Claude Desktop, Claude Code, Cursor or any MCP client. Three read-only tools are offered: `list_skills`, `get_skill`, `get_skill_phase`.

**Local (stdio)** — add to your client's MCP config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "aegis": { "command": "aegis", "args": ["mcp"] }
  }
}
```

**Remote (Streamable HTTP)** — a deployed instance serves MCP at `POST /api/mcp`:

```json
{
  "mcpServers": {
    "aegis": { "url": "https://aegis-skills.vercel.app/api/mcp" }
  }
}
```

Both transports serve the same read-only tools and only public skill content.

### Let Themis use external MCP tools

Themis sub-agents can call tools on external MCP servers during analysis, under a deterministic governance boundary — **opt-in and default-deny**. Configure servers in the `THEMIS_MCP_SERVERS` environment variable (a JSON array):

```json
[
  {
    "id": "osint",
    "transport": "http",
    "url": "https://mcp.internal.example/osint",
    "allowedSkills": ["attack-surface-mapping", "threat-intel-synthesis"],
    "allowWrite": false
  }
]
```

Governance rules, all enforced in code (not by the model):

- **Default-deny.** No config → agents get no external tools. A server is only reachable by the skills in its `allowedSkills`.
- **Read-only for autonomous agents.** Only tools classified `read` are auto-invoked. `write`/`execute` tools are never run autonomously — they are recorded as **approval requests** (`mcpApprovals` in the response) for a human to run out-of-band, and only when `allowWrite: true`.
- **Bounded.** Per-run call budget and timeouts; external output is redacted, size-capped, and wrapped so it is treated as data, not instructions.

On serverless (Vercel) only `http` servers are reachable; `stdio` is for local development.

---

## Themis

An AI-powered threat analysis engine. Themis accepts a task description and security context, decomposes it into sub-tasks, fans out to specialist skill agents in parallel, applies guardrails to every output, and synthesises a structured findings report.

### Architecture

```
Task input
    │
  validate          — sanitise task + context
    │
  decompose         — plan sub-tasks (capped, skill-validated, acyclic)
    │
  schedule ─────────┐  — dependency-aware staged dispatch
    │               │
  skill-agent (×ready, parallel)   — ReAct agents; each loads its skill phase,
    │               │                reads peers' findings, and may call governed
    └───────────────┘                external MCP read tools
    │  (once nothing is pending)
  guardrail         — block / flag / pass per finding
    │
  synthesise        — reduce to a structured report
    │
  audit             — write metadata to SQLite (no findings stored)
```

Every request compiles its own graph with its own in-RAM `MemorySaver`, so no run
state is shared between requests. Dependent sub-tasks run only after the work they
depend on completes, and can read it. Nothing persists beyond the request lifecycle
except a metadata-only SQLite debrief row.

### API

```bash
curl -X POST https://your-deployment.vercel.app/api/themis \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "Assess the attack surface for a hybrid cloud + OT environment",
    "context": {
      "environments": ["enterprise", "hybrid", "ot"],
      "attackSurfaceTags": ["network", "lateral-movement", "credential-theft"]
    }
  }'
```

Response:
```json
{
  "report": "## Findings\n...",
  "guardrailSummary": { "passed": 3, "flagged": 0, "blocked": 0 },
  "skillTrace": ["mitre-attack", "deception-engineering"],
  "totalInputTokens": 12400,
  "totalOutputTokens": 3200,
  "durationMs": 8400,
  "threadId": "abc-123",
  "mcpApprovals": [],
  "mcpCallCount": 0
}
```

`mcpApprovals` lists any state-changing external tool actions the agents proposed but did **not** run (empty unless external MCP servers are configured); `mcpCallCount` is the number of external read-tool calls made.

**SSE streaming** — pass `Accept: text/event-stream` to receive node-name events as the graph executes. Node content is never included in stream events.

### Other APIs

| Endpoint | Purpose |
|---|---|
| `POST /api/audit` | Standards-based compliance audit (CIS, NIST CSF, ISO 27001, SOC 2, PCI-DSS, HIPAA, IEC 62443, NIST 800-53) |
| `POST /api/exposure` | Exposure validation (CTEM) — exposure, exploitability, impact, detection, remediation and verification as independent states |
| `POST /api/mcp` | Aegis skill library over MCP (Streamable HTTP) |

### Requirements

At least one LLM provider API key:

```bash
ANTHROPIC_API_KEY=...      # Claude — preferred
OPENAI_API_KEY=...         # fallback
GOOGLE_API_KEY=...         # fallback
# Also supported: MISTRAL_API_KEY, DEEPSEEK_API_KEY, QWEN_API_KEY, NVIDIA_API_KEY
```

External MCP tools for Themis (optional, opt-in):

```bash
THEMIS_MCP_SERVERS='[{"id":"osint","transport":"http","url":"https://...","allowedSkills":["attack-surface-mapping"],"allowWrite":false}]'
```

LangSmith tracing (optional):

```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=themis
```

---

## Security

Key constraints enforced in the codebase:

- **LLM SDKs server-only.** Provider SDKs are importable only in `lib/themis/provider.ts`. Next.js `serverExternalPackages` enforces this at bundle level.
- **No findings persistence.** Task content and LLM outputs are never written to any store — not SQLite, not logs, not external services.
- **Sanitised errors.** All client-facing errors pass through `safeError()` — no stack traces, paths, or model names reach the client.
- **Sanitised logs.** Loggers receive only metadata (hashes, token counts, durations, skill slugs). No user input or LLM output appears in logs.
- **Path traversal prevention.** Skill name and phase ID are validated against an allowlist before any file read; phase refs resolve only inside the skill's own directory (with symlink checks).
- **Governed external tools.** External MCP access is opt-in and default-deny. Autonomous agents auto-invoke only read-classified tools; write/execute are classified conservatively and routed to human approval, never run by the model. The MCP server Aegis exposes is read-only and serves only public skill content.

See [`docs/TECHNICAL.md`](docs/TECHNICAL.md) for the full security model and data flow.

---

## Development

```bash
npm install
cp .env.local.example .env.local   # add at least one LLM key
npm run dev                         # http://localhost:3000
npm test                            # 310 tests
npm run build                       # production build
```

---

## Project structure

```
├── app/api/themis/        # Themis streaming route (App Router)
├── bin/                   # aegis CLI
├── components/            # React UI components
├── docs/                  # Technical documentation
│   └── TECHNICAL.md
├── lib/
│   ├── skill-reader.js    # Aegis skill loader with path traversal protection
│   └── themis/            # Themis engine
│       ├── graph/         # LangGraph nodes, state, tools
│       ├── debrief.ts     # SQLite audit writer
│       ├── llm-factory.ts # Provider selection
│       ├── provider.ts    # LLM SDK (server-only)
│       └── index.ts       # orchestrate() entry point
├── pages/                 # Next.js pages router (Aegis UI + API)
├── skills/                # Skill source files + compiled artifacts
└── styles/globals.css     # Design system
```

---

## License

MIT © Drupad Sachania
