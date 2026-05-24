# Themis · Aegis

**Platform-agnostic AI skill compiler and multi-agent threat analysis — built for defenders.**

Two subsystems, one deployment:

| | Aegis | Themis |
|---|---|---|
| **What** | Skill compiler + marketplace | LangGraph orchestrator |
| **Does** | Write once → deploy to any AI platform | Fan-out parallel threat analysis |
| **Format** | SKILL.md → system prompt / ChatGPT Action / MCP | POST request → structured findings report |

---

## Aegis

Author defensive security skills in a single `SKILL.md` file. Aegis compiles it to every platform format — one source, deployed everywhere.

### Skill library

| Skill | Framework | Purpose |
|---|---|---|
| `mitre-attack` | ATT&CK | Adversary TTP mapping and detection guidance |
| `mitre-engage` | Engage | Deception activity planning and execution |
| `deception-engineering` | Engage + ATT&CK | Honeypot and honeytoken deployment |
| `mitre-atlas` | ATLAS | AI/ML attack surface defence |
| `threat-modeling` | STRIDE | Systematic threat modelling for systems |
| `threat-hunting` | — | Hypothesis-driven hunt methodology |
| `network-security` | — | Network segmentation and monitoring |
| `endpoint-security` | — | Endpoint detection and hardening |
| `security-operations` | — | SOC workflow and incident response |
| `attack-surface-mapping` | — | External and internal ASM |
| `vulnerability-management` | — | CVE triage and remediation prioritisation |
| `compliance-frameworks` | — | NIST, ISO 27001, CIS Controls mapping |
| `supply-chain-security` | — | Dependency and build pipeline hardening |

### Quick start

```bash
# Install the compiler
npm install -g @aegis/compiler

# Compile a skill
aegis compile skills/mitre-attack --base-url https://your-deployment.vercel.app

# Deploy: push to Vercel — the marketplace and API are live automatically
```

### Deploying a skill

After compilation, three artifacts are generated in `skills/<name>/artifacts/`:

- `system-prompt.txt` — paste into Claude Projects, Gemini Gems, or any chat UI
- `openai-action.json` — import into ChatGPT GPT Builder → Add Action
- `mcp-manifest.json` — wire into `claude_desktop_config.json` for Claude Desktop / Cursor

---

## Themis

An AI-powered threat analysis engine. Themis accepts a task description and security context, decomposes it into sub-tasks, fans out to specialist skill agents in parallel, applies guardrails to every output, and synthesises a structured findings report.

### Architecture

```
Task input
    │
  specNode          — decompose into sub-tasks
    │
  fanOutNode        — Send() parallel dispatch
    │
  ┌──────────────────────────┐
  │ skillAgentNode (×N)      │  — ReAct agents, one per sub-task
  │ + guardrailNode          │  — block / flag / pass
  └──────────────────────────┘
    │
  synthesisNode     — reduce to structured report
    │
  auditNode         — write metadata to SQLite (no findings stored)
```

LangGraph `MemorySaver` holds graph state in-RAM for the duration of a session. Nothing persists beyond the request lifecycle except a metadata-only SQLite debrief row.

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
  "threadId": "abc-123"
}
```

**SSE streaming** — pass `Accept: text/event-stream` to receive node-name events as the graph executes. Node content is never included in stream events.

### Requirements

At least one LLM provider API key:

```bash
ANTHROPIC_API_KEY=...      # Claude — preferred
OPENAI_API_KEY=...         # GPT-4o-mini — fallback
GOOGLE_GENERATIVE_AI_API_KEY=...  # Gemini — fallback
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
- **Path traversal prevention.** Skill name and phase ID are validated against an allowlist before any file read.

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
