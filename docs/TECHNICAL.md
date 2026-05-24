# Technical Reference — Themis · Aegis

> Deep-dive architecture, API contracts, security model, and extension guide for developers building on or contributing to the platform.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Aegis — Skill Compiler](#2-aegis--skill-compiler)
3. [Aegis — Marketplace API](#3-aegis--marketplace-api)
4. [Themis — LangGraph Orchestrator](#4-themis--langgraph-orchestrator)
5. [Security Model](#5-security-model)
6. [Data Flow](#6-data-flow)
7. [Environment Variables](#7-environment-variables)
8. [Extension Guide](#8-extension-guide)

---

## 1. System Overview

The platform consists of two subsystems that share a runtime but operate independently:

| Subsystem | Role | Entry point |
|---|---|---|
| **Aegis** | Skill authoring, compilation, marketplace | `pages/` + `lib/skill-reader.ts` |
| **Themis** | AI-powered threat analysis orchestrator | `lib/themis/` + `app/api/themis/` |

Both subsystems are deployed as a single Next.js application. Aegis pages are statically generated at build time; Themis runs as a server-side streaming endpoint.

---

## 2. Aegis — Skill Compiler

### 2.1 Skill format

Each skill lives in `skills/<name>/` and follows this structure:

```
skills/
  mitre-attack/
    SKILL.md           # Canonical source — phases + metadata
    skill.json         # Compiled manifest
    artifacts/
      system-prompt.txt    # Compiled system prompt
      openai-action.json   # ChatGPT Action schema
      mcp-manifest.json    # MCP server manifest
```

### 2.2 SKILL.md schema

```markdown
---
name: mitre-attack
version: 1.0.0
description: "Adversary TTP mapping using MITRE ATT&CK"
tags: [network, endpoint, lateral-movement]
frameworks: [mitre-attack]
context:
  environments: [enterprise, cloud]
  attackSurfaceTags: [network, endpoint]
---

## Phase: reconnaissance

Phase content here — this becomes a context window in the system prompt.

## Phase: mapping

...
```

### 2.3 Compilation

```bash
# Compile a single skill
aegis compile skills/mitre-attack --base-url https://your-deployment.vercel.app

# Compile all skills
aegis compile skills/* --base-url https://your-deployment.vercel.app
```

The compiler (`bin/aegis.js`) runs three adapters in sequence:

1. **System prompt adapter** (`lib/adapters/system-prompt.js`) — concatenates phase content with role preamble
2. **OpenAI action adapter** (`lib/adapters/openai-action.js`) — generates ChatGPT Actions JSON schema
3. **MCP manifest adapter** (`lib/adapters/mcp-manifest.js`) — generates MCP server manifest

### 2.4 Health scoring

The self-learning health pipeline (`scripts/update-health.js`) scores each skill 0–1 based on:
- Phase token coverage
- Tag completeness  
- Framework linkage
- Last-compiled freshness

Scores are cached in `health.json` and surfaced in the marketplace UI as progress bars.

---

## 3. Aegis — Marketplace API

All endpoints enforce the security headers defined in `next.config.js` (HSTS, X-Frame-Options, CSP, etc.).

### GET `/api/skills`

Returns the full skill manifest list.

```json
[
  {
    "name": "mitre-attack",
    "version": "1.0.0",
    "description": "...",
    "tags": ["network", "endpoint"],
    "frameworks": ["mitre-attack"],
    "phases": 4,
    "healthScore": 0.92
  }
]
```

### GET `/api/:skill/manifest`

Returns a single skill manifest. The `ref` field (internal file path) is stripped before the response is sent.

### POST `/api/:skill/invoke`

Invokes a specific phase by name.

Request body:
```json
{ "phase": "reconnaissance" }
```

Response: phase content as plain text.

### GET `/api/:skill/phase/:phaseId`

Fetches raw phase content for use by Themis skill agents.

Path traversal is prevented by allowlist validation in `lib/skill-reader.js` — phase IDs are checked against the compiled manifest before any file read occurs.

### POST `/api/recommend`

Returns skills ranked by relevance to the supplied context.

Request body:
```json
{
  "environments": ["enterprise", "cloud"],
  "attack_surface_tags": ["network", "credential-theft"]
}
```

Response:
```json
{ "skills": [ /* ranked manifest list */ ] }
```

---

## 4. Themis — LangGraph Orchestrator

### 4.1 Architecture

Themis is a **LangGraph StateGraph** with six nodes wired as a directed acyclic graph:

```
specNode
   │
fanOutNode  ── Send() ──▶ skillAgentNode (×N, parallel)
                              │
                         guardrailNode
                              │
                         synthesisNode
                              │
                          auditNode
```

**Fan-out** uses the LangGraph `Send` API — `fanOutNode` returns one `Send` per sub-task, LangGraph executes them in parallel on separate graph branches.

**State** is held in `ThemisAnnotation` (14 channels, `lib/themis/graph/state.ts`) using typed reducers:
- `append` — accumulates sub-task results, guardrail outputs
- `sum` — token counters
- `last-write-wins` — final report, thread metadata
- `dedup-union` — skill slug sets
- `first-write-wins` — task/context (set once, never mutated)

**Checkpointing** uses `MemorySaver` — state is in-RAM only, scoped to a `thread_id`. No external database, no network calls for checkpointing.

### 4.2 Nodes

| Node | File | Responsibility |
|---|---|---|
| `specNode` | `graph/nodes.ts` | Parse task + context, emit sub-tasks |
| `fanOutNode` | `graph/nodes.ts` | Return `Send[]` for parallel dispatch |
| `skillAgentNode` | `graph/nodes.ts` | Run `createReactAgent` for one sub-task; call skill phase fetch tool |
| `guardrailNode` | `graph/nodes.ts` | Score each output; block/flag/pass |
| `synthesisNode` | `graph/nodes.ts` | Reduce guardrailed results into structured report |
| `auditNode` | `graph/nodes.ts` | Write metadata-only debrief to SQLite; strip findings from DB row |

### 4.3 Tools available to skill agents

| Tool | Source | Description |
|---|---|---|
| `fetchSkillPhase` | `graph/tools.ts` | Fetches phase content from `/api/:skill/phase/:id`; validates against content integrity patterns |
| `readFindings` | `graph/tools.ts` | Provides read access to findings accumulated in graph state |

Both tools sanitise inputs and validate outputs before returning. `fetchSkillPhase` enforces a blocked-content pattern list and validates phase content before returning to the agent.

### 4.4 Providers

LLM provider selection is determined at runtime based on available API keys (`lib/themis/provider.ts`). Supported providers with tiered model selection (fast/standard/power):

| Provider | Env var | Fast | Standard | Power |
|---|---|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | claude-haiku-4-5-20251001 | claude-sonnet-4-6 | claude-opus-4-6 |
| OpenAI | `OPENAI_API_KEY` | gpt-4o-mini | gpt-4o | o1 |
| Google | `GOOGLE_API_KEY` | gemini-2.0-flash | gemini-2.5-pro | gemini-2.5-pro |

**All SDK imports are restricted to `lib/themis/provider.ts`.** No provider SDK may be imported elsewhere.

Note: Google API key is stored in `GOOGLE_API_KEY` (not `GOOGLE_GENERATIVE_AI_API_KEY`).

### 4.5 API — POST `/api/themis`

**Standard (JSON) request:**
```json
{
  "task": "Assess the attack surface for a hybrid cloud + OT environment",
  "context": {
    "environments": ["enterprise", "hybrid", "ot"],
    "attackSurfaceTags": ["network", "lateral-movement"]
  },
  "threadId": "optional-session-id"
}
```

**Standard response:**
```json
{
  "report": "## Findings\n...",
  "subTaskResults": [...],
  "guardrailSummary": { "passed": 3, "flagged": 0, "blocked": 0 },
  "skillTrace": ["mitre-attack", "deception-engineering"],
  "totalInputTokens": 12400,
  "totalOutputTokens": 3200,
  "durationMs": 8400,
  "threadId": "abc-123"
}
```

**SSE streaming (pass `Accept: text/event-stream`):**

The endpoint emits node-name events as the graph executes:
```
data: {"event":"node","node":"specNode"}

data: {"event":"node","node":"skillAgentNode"}

data: {"event":"done","threadId":"abc-123"}
```

Node content, findings, and LLM outputs are **never** included in SSE events.

### 4.6 Debrief (SQLite audit)

`lib/themis/debrief.ts` writes a metadata-only row to a local SQLite database after each orchestration:

| Column | Content |
|---|---|
| `thread_id` | Session correlation ID |
| `task_hash` | SHA-256 of the task string (not the task itself) |
| `skill_slugs` | JSON array of skills invoked |
| `guardrail_summary` | `{ passed, flagged, blocked }` |
| `total_input_tokens` | Aggregated input token count |
| `total_output_tokens` | Aggregated output token count |
| `duration_ms` | Wall-clock duration |
| `created_at` | UTC timestamp |

**Findings text and task content are never written to SQLite.**

---

## 5. Security Model

### 5.1 Principles

1. **Every input is untrusted.** Task content, LLM outputs, skill phase content — all are treated as adversarial.
2. **Sanitise before log.** Loggers receive only metadata (hashes, counts, durations). No user input or LLM output ever reaches a log line.
3. **Sanitise before client.** All errors are normalised through `safeError()` which returns one of three fixed strings — no stack traces, internal paths, model names, or provider names reach the client.
4. **LLM SDK server-only.** Provider SDKs (`@anthropic-ai/sdk`, `openai`, `@google/generative-ai`) are importable only in `lib/themis/provider.ts`. Next.js `serverExternalPackages` enforces this at the bundle level.
5. **Memory ephemeral.** No findings or task content is persisted anywhere — not in Redis, not in Supabase, not in SQLite.

### 5.2 Input validation — Themis route

The route handler (`app/api/themis/route.ts`) validates the request body before any processing:

- `task`: non-empty string, max 4000 characters
- `context.environments`: string array, max 20 items, each ≤ 64 chars
- `context.attackSurfaceTags`: string array, max 20 items, each ≤ 64 chars
- `threadId`: optional string, max 128 chars

### 5.3 Path traversal prevention — Aegis

`lib/skill-reader.js` uses an allowlist model:

1. Skill name is checked against compiled manifests (no filesystem scan)
2. Phase ID is checked against `manifest.phases[].id` before file read
3. File path is constructed from allowlisted values only — no user string interpolation into paths

### 5.4 Content integrity — Themis tools

`fetchSkillPhase` in `lib/themis/graph/tools.ts` validates phase content against a blocked-content pattern list before returning it to a skill agent:

```
/<script/i          — script injection
/javascript:/i      — URI handler injection
/\bdata:[a-z]/i     — data URI scheme
/eval\(/i           — eval injection
```

---

## 6. Data Flow

```
User request
    │
    ▼
Route handler (validates + sanitises input)
    │
    ▼
orchestrate() in lib/themis/index.ts
    │
    ▼
getThemisGraph() — lazy singleton, MemorySaver checkpointer
    │
    ▼
graph.invoke(initialState, { configurable: { thread_id } })
    │
    ├── specNode         (decompose task → sub-tasks)
    │
    ├── fanOutNode       (emit Send[] for each sub-task)
    │     │
    │     ├── skillAgentNode + guardrailNode  (×N parallel)
    │     ├── skillAgentNode + guardrailNode
    │     └── skillAgentNode + guardrailNode
    │
    ├── synthesisNode    (reduce → report)
    │
    └── auditNode        (write metadata to SQLite, strip findings)
    │
    ▼
OrchestrateResponse  (sanitised, threadId always returned)
    │
    ▼
Route handler (safeError wrapper, JSON or SSE)
    │
    ▼
Client
```

---

## 7. Environment Variables

See `.env.local.example` for the full template. Key variables:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | One of three | Anthropic Claude API key |
| `OPENAI_API_KEY` | One of three | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | One of three | Google Gemini API key |
| `LANGCHAIN_TRACING_V2` | Optional | Enable LangSmith tracing (`true`/`false`) |
| `LANGCHAIN_API_KEY` | If tracing | LangSmith API key |
| `LANGCHAIN_PROJECT` | If tracing | LangSmith project name |
| `DEBRIEF_DB_PATH` | Optional | SQLite path (default: `debrief.sqlite`) |

At least one LLM provider key is required. If multiple are set, Themis uses the first available in the order: Anthropic → OpenAI → Google.

---

## 8. Extension Guide

### 8.1 Adding a new skill

1. Create `skills/<name>/SKILL.md` following the format in §2.2
2. Run `aegis compile skills/<name> --base-url https://...`
3. Verify `skills/<name>/skill.json` and `artifacts/` were generated
4. Run `npm run build` — the new skill appears in the marketplace automatically

### 8.2 Adding a new Themis node

1. Add the node function to `lib/themis/graph/nodes.ts`
2. Add any new state channels to `ThemisAnnotation` in `lib/themis/graph/state.ts`
3. Wire the node in `lib/themis/graph/index.ts` using `.addNode()` and `.addEdge()`
4. Add tests in `__tests__/themis/graph/`
5. Run the full test suite: `npm test`

### 8.3 Adding a new LLM provider

1. Add the SDK to `serverExternalPackages` in `next.config.js`
2. Add a new case in `lib/themis/provider.ts` following the existing provider factory pattern
3. Add the env var to `.env.local.example`
4. The provider will be selected automatically when the API key is set

### 8.4 Running locally

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local — add at least one LLM provider key

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```
