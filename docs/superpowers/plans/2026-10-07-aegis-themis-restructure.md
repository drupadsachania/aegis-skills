# Aegis + Themis Restructure — Migration Plan

**Status:** structure signed off 2026-10-07. Detailed per-phase plans and the binding contracts live in [`restructure/`](restructure/): start with [`00-contracts.md`](restructure/00-contracts.md).

**Goal:** split the current single npm package into three targeted products in one repo:

- **Aegis** — a pure-content cybersecurity skill pack (open Agent Skills standard) plus a thin read-only MCP adapter and installer.
- **Themis** — a security-operations agent that runs two ways: on top of the user's existing AI (mode 1), or as a standalone local app with its own web UI (mode 2).
- **Website** — zero-install access, the distribution hub, and hosted docs for both.

---

## Locked decisions

| # | Decision |
|---|---|
| 1 | Single repo, npm workspaces. No new monorepo tooling. |
| 2 | Aegis is content only (markdown + JSON). Its MCP server is a thin, read-only content adapter and never calls a model. |
| 3 | Themis splits into `themis-core` (deterministic, no LLM; owns the workflow definition), `themis-gateway` (governed MCP client shared by both modes), `themis-plugin` (mode 1: host AI is the LLM, runs the core workflow directly, **no LangGraph**) and `themis-app` (mode 2: wraps the same workflow in LangGraph; bring-your-own-key or local model). |
| 4 | No Docker or any containerisation. Mode 2 ships as a Node app (`npx`/global install) serving a **web interface only** on `127.0.0.1`. No desktop UI or wrapper. |
| 5 | `node:sqlite` (Node ≥ 22.5) replaces `better-sqlite3`. No native compile anywhere. |
| 6 | ChatGPT Actions are removed entirely. ChatGPT is reached through MCP (app directory) and single-file prompts. |
| 7 | The website hosts no Themis inference. `/api/themis`, `/api/audit` and `/api/exposure` move into `themis-app`. |
| 8 | Licence: dual `Apache-2.0 OR MIT` across all workspace packages (`"license": "(Apache-2.0 OR MIT)"`), with `LICENSE`, `LICENSE-APACHE`, `LICENSE-MIT` and `SECURITY.md` at the root. |
| 9 | Listed as cybersecurity in marketplaces. Compliance story: OWASP Top 10 for LLM + Agentic apps and NIST AI RMF for reviewers; MITRE ATLAS as Themis's own threat model. |

## Target structure

```
aegis-skills/                          (repo root; npm workspaces)
├─ .claude-plugin/marketplace.json     lists plugins: aegis, themis
├─ packages/
│  ├─ aegis/                           npm: aegis-skills (name to verify)
│  │  ├─ skills/<name>/SKILL.md, references/*.md, skill.json
│  │  ├─ .claude-plugin/plugin.json, .mcp.json
│  │  ├─ gemini-extension.json, GEMINI.md
│  │  ├─ server.json                   MCP Registry entry
│  │  ├─ mcp/                          read-only adapter (stdio)
│  │  └─ bin/aegis.js                  install · uninstall · update · list · mcp
│  ├─ themis-core/                     deterministic engine + workflow definition; no LLM/LangChain imports
│  ├─ themis-gateway/                  governed MCP client (core policy + MCP SDK), used by both modes
│  ├─ themis-plugin/                   mode 1: agents/, orchestration skill, MCP tools over core + gateway
│  └─ themis-app/                      mode 2: LangGraph runtime, providers, local UI, node:sqlite
├─ apps/web/                           site, docs hub, prompt/zip distribution, hosted Aegis MCP
├─ docs/{aegis,themis,web}/
├─ scripts/                            build targets, skill lint, intel-sync, dep guards
├─ LICENSE                            dual-licence notice: Apache-2.0 OR MIT
├─ LICENSE-APACHE
├─ LICENSE-MIT
└─ SECURITY.md
```

Dependency direction is one-way: `web → aegis`, `themis-* → aegis`, `themis-gateway → themis-core`, `themis-plugin/app → themis-gateway + themis-core`. Nothing depends on the web app or on Themis.

## Version contract (Aegis ↔ Themis)

- `skill.json` field `"osk"` is the format contract. Themis declares the `osk` major it supports.
- In the repo, a Themis build consumes Aegis from the same commit; the release notes record the exact Aegis version.
- At runtime Themis accepts any installed Aegis with the same `osk` major:
  - patch (content fixes, weekly intel) and minor (new skills or phases) are picked up automatically;
  - an `osk` major bump requires a Themis release.
- Every Themis report stamps both the Themis version and the Aegis version.
- `themis-plugin` does **not** bundle skills. Its `.mcp.json` pins the Aegis adapter (`npx aegis-skills@^1 mcp`), which avoids duplicate skill names when both plugins are installed. `themis-app` bundles the pack because it is standalone.

## Where current code goes

| Current | Destination |
|---|---|
| `skills/` | `packages/aegis/skills/` |
| `lib/skill-reader.js`, `lib/skill-families.js`, `lib/mcp/aegis-server.js`, `lib/cli/mcp.js` | `packages/aegis/mcp/` |
| `lib/cli/*`, `lib/tools/*`, `lib/config/*`, `bin/aegis.js` | rewritten as `packages/aegis/bin` (installer) |
| `src/compiler.js`, `parser.js`, `manifest.js`, `schema/`, `adapters/system-prompt.js` | `scripts/` build (flattened prompts, zips, platform manifests) |
| `src/adapters/openai-action.js`, `adapters/mcp.js`, `skills/*/artifacts/{openai-action,mcp-manifest}.json` | **deleted** |
| `lib/themis/exposure/*`, `audit/{scorer,standards,types}`, `guardrail`, `sanitise`, `secrets`, `mcp/{config,tool-policy}`, `types`, scheduling logic from `graph/nodes` | `packages/themis-core/` (each file confirmed LLM-free when moved) |
| `lib/themis/mcp/client.ts` + the call path of `mcp/agent-tools.ts` (budget, redaction, untrusted-output wrapping, propose-only) | `packages/themis-gateway/` |
| `lib/themis/graph/*`, `llm-factory`, `provider`, `decompose`, `synthesise`, `checkpointer`, `debrief`, the LangChain tool wrapping in `mcp/agent-tools.ts`, LLM-dependent `audit/*` | `packages/themis-app/` (the graph topology itself moves to core as the workflow definition) |
| `app/api/{themis,audit,exposure}` | `themis-app` local server routes |
| `app/api/mcp`, `pages/*`, `components/*`, `styles/*` | `apps/web/` |
| `pages/api/[skill]/invoke.js`, `pages/api/recommend.js` | audit in Phase 5: keep only if no model call; otherwise delete |
| `scripts/intel-sync.js`, `intel-routing.js`, `skill-health.js`, `.github/workflows/skill-health.yml` | `scripts/`, with paths updated |

---

## Phases

### Phase 0 — Scaffold (no behaviour change)

- Feature branch; convert the root to npm workspaces with the target folders.
- Move files to their destinations with minimal path fixes, so existing tests stay green.
- Dual-license as `Apache-2.0 OR MIT`: add `LICENSE`, `LICENSE-APACHE`, `LICENSE-MIT`; update every `package.json` and the README badges. Add `SECURITY.md`.
- **Exit:** current tests pass from the new layout; site builds and deploys unchanged.

### Phase 1 — Aegis skill pack

1. **Standard frontmatter.** `SKILL.md` keeps only `name`, `description`, `license`, `metadata` (version, frameworks, tags, phases, research feeds). Drop `platforms` model pins. Clean up `skill.json`: keep `osk`, phases and token counts; remove the non-existent endpoints.
2. **Safety block in every skill:** defensive purpose, authorisation assumption, scope limits. Use `exposure-validation`'s authorisation phase as the pattern.
3. **Remove ChatGPT Actions:** the adapter, artifacts, the ChatGPT detector, the InstallTabs ChatGPT path, and README/docs mentions (63 references in 17 files today).
4. **Skill lint** (replaces the fake `npm test`): frontmatter conforms to the spec, `name` matches the folder, description ≤ 1024 chars, every referenced file exists, per-phase and total token budgets hold, safety block present.
5. **MCP adapter:** read-only, stdio. Dependencies limited to the MCP SDK, zod and a frontmatter parser.
6. **Installer** (graphify-style):
   - `aegis install [--platform <p>] [--project]`, `aegis uninstall`, `aegis update`, `aegis list`, `aegis mcp`; `init` is an alias of `install`.
   - Writes each platform's native location and registers the MCP server. Verify every target path during implementation: Claude Code, Codex, Gemini CLI, Cursor, VS Code Copilot, Antigravity.
   - Refreshes installed skills automatically after upgrade, saving user edits as `.bak`.
7. **Platform manifests:** Claude plugin (`plugin.json` + `.mcp.json`), root `marketplace.json`, `gemini-extension.json` + `GEMINI.md`, `server.json`.
8. **Exit:**
   - on a clean machine `npx aegis-skills install --platform claude` works;
   - `/plugin marketplace add drupadsachania/aegis-skills` installs Aegis;
   - Gemini extension install is verified, or the release-archive fallback is in place;
   - the package has ≤ 4 runtime dependencies.

### Phase 2 — themis-core

- The single source of truth for every rule-based security decision in both modes:
  - risk scoring and the exposure state machine;
  - secret sanitisation and pattern redaction;
  - MCP tool policy, authorisation checks and the human-approval gate;
  - audit-log generation and structured persistence;
  - **the workflow definition**: the steps (validate → decompose → schedule → fan-out → guardrail → synthesise → audit), the allowed transitions, and the guard on each transition, as plain data and functions. Mode 1 runs it directly; mode 2 maps it onto LangGraph. One definition, so the modes cannot drift.
- Allowed dependencies: Node built-ins (`node:sqlite`, `node:crypto`, `node:fs`) and `zod`. Nothing else.
- Extract the deterministic modules listed above. Move their tests with them.
- Dependency guard in CI: `themis-core` may not import LangChain, LangGraph, any model SDK, or any native module.
- Swap persistence to `node:sqlite` behind a small store interface.
- **themis-gateway** (built in this phase, used by Phases 3 and 4):
  - connects to the external MCP servers registered in Themis config (same format as today's `THEMIS_MCP_SERVERS`: per-skill allowlist, `allowWrite`, call budget, timeout);
  - every call goes through core policy: tools are classified read / write / execute; reads run with budget, secret redaction and untrusted-output wrapping; writes and executes become approval requests and never run on the model's say-so;
  - every call, result and approval is written to the core audit log;
  - soft-fail: an unreachable server degrades to "no tools", never a crashed run.
- **Exit:** core has its own test suite, zero model dependencies, and runs on stock Node. The gateway passes the existing governance and agent-tools tests.

### Phase 3 — themis-plugin (mode 1: built on top of the user's AI)

- MCP server exposing core as tools: `plan`, `schedule`, `validate_exposure`, `assess_risk`, `record_finding`, `request_approval`, `get_report`, and similar. Write and execute actions stay propose-only.
- **External tools through the gateway.** Security tools the user registers with Themis are re-exposed to the host AI as namespaced, governed tools (`themis__<server>__<tool>`):
  - read tools run immediately, within budget, redacted, wrapped as untrusted, and audited;
  - write/execute tools return an approval request. **The approval must come from the human, never the model.** Where the host supports MCP elicitation, Themis asks the user directly through the client's own prompt. Where it does not, Themis never executes the action: it hands the approved proposal back for the human to run through the host's own permission-gated tools, and records the outcome.
- **Honest boundary, documented:** tools the user connects straight to their host AI bypass Themis, so they are not governed or audited. The orchestration skill tells the host to route security tools through Themis, but cannot force it. Mode 2 governs every call.
- An orchestration skill describing the graph (validate → decompose → schedule → fan-out → guardrail → synthesise → audit), with the host AI performing every reasoning step.
- Sub-agent definitions for hosts that support them (Claude Code, Codex, Gemini CLI). Hosts without sub-agents fall back to running steps sequentially.
- `.mcp.json` registers both the Themis tools and the pinned Aegis adapter. Add Themis to the root `marketplace.json`.
- **Exit:** a full exposure-validation run inside Claude Code with **no API key**, producing a report stamped with both versions.

### Phase 4 — themis-app (mode 2: standalone local SOC)

- **Runtime:** LangGraph, built from the core workflow definition (replacing the hand-written topology in `lib/themis/graph`). External tools come through `themis-gateway`; its approval requests feed the dashboard's Approvals page. Providers: Anthropic, OpenAI, Gemini (bring your own key), plus one OpenAI-compatible adapter covering local Ollama and LM Studio.
- **`themis dashboard`:** a Node server bound to `127.0.0.1` serving a small static frontend built at publish time, with no Next.js runtime. Pages, modelled on Hermes Agent's dashboard:
  - **Run** — start a task, watch sub-agents stream.
  - **Sessions** — history, resume.
  - **Findings & Reports** — export.
  - **Approvals** — queue of proposed write/execute actions; nothing runs without a click.
  - **Skills** — installed Aegis version, enable or disable skills, intel freshness.
  - **MCP servers** — the existing allowlist and governance config.
  - **Models & Keys** — providers grouped, set/missing status, local endpoint test.
  - **Settings** — limits, budgets, data location.
- **Config:** lives in `~/.themis/` (config file + `.env` + SQLite), shared with the CLI so both stay in sync.
- The `/api/themis`, `/api/audit` and `/api/exposure` handlers become local routes.
- **Exit:** `npx @aegis-skills/themis dashboard` on a clean Windows/macOS/Linux machine (no build tools) reaches a working run with a local model and with a cloud key.

### Phase 5 — Website redesign (`apps/web`)

- Present Aegis + Themis as one pack with a "choose your path" matrix:

| Path | For | How |
|---|---|---|
| Zero install | anyone | copy a single-file prompt, or download a skill zip |
| Hosted MCP | Claude.ai / ChatGPT / any MCP client | connect to the hosted read-only Aegis MCP |
| Skill pack | coding assistants | `/plugin marketplace add …`, `gemini extensions install …`, `npx aegis-skills install --platform …` |
| Themis on your AI | Claude Code, Codex, Gemini CLI | install the Themis plugin |
| Themis standalone | local SOC | `npx @aegis-skills/themis dashboard` |

- Single-file prompts flatten every phase into one file and carry an "intel as of <date>" stamp. Generate them at build time; they are not committed per skill.
- Remove the Themis/audit/exposure API routes. Remove Supabase and other dependencies if they were used only by those routes.
- Docs hub with separate sections for Aegis, Themis (mode 1 / mode 2) and the hosted MCP, plus install guides per platform.
- **Exit:** the site has no model-calling code; every install path on the site has been tested end to end.

### Phase 6 — Compliance & listings

- Map Themis controls to OWASP Top 10 for LLM / Agentic applications and NIST AI RMF; publish the mapping. Write an ATLAS-based threat model for Themis.
- Privacy policy and test prompts (required by the directory reviews).
- Listings, all under the cybersecurity category:
  - Anthropic plugin directory: Aegis + Themis plugins.
  - Anthropic Connectors directory: hosted Aegis MCP.
  - ChatGPT app directory: hosted Aegis MCP + Apps SDK metadata.
  - Gemini extensions gallery.
  - MCP Registry (and optionally Smithery).

### Phase 7 — Release pipeline

- Independent semver per package. CI runs skill lint, tests, and dependency guards: Aegis may only use its allowlisted dependencies, and themis-core may not import any LLM library.
- A GitHub release attaches skill zips and the Gemini extension archive. Manifest versions are bumped from one script so they never drift.
- Deprecate `@aegis-skills/core` on npm with a pointer to the new packages.
- Point the intel-sync workflow at the new paths; its weekly commits become Aegis patch releases.

---

## Risks and checks

- **npm names:** check `aegis-skills` and `@aegis-skills/themis` availability before Phase 1 publishes.
- **Gemini subdirectory install:** may require root-level manifests; fall back to release archives.
- **Mode 1 parity:** sub-agent support varies by host; define the sequential fallback in the orchestration skill.
- **Mode 1 approval channel:** MCP elicitation support varies by host. Without it, approved actions are handed to the human instead of executed, so mode 1 never lets the model approve its own write/execute calls.
- **Mode 1 workflow state:** hosts may restart the plugin's process between calls, so in-flight runs are persisted to core's `node:sqlite` store and resumed by run ID.
- **Platform paths change often:** keep installer targets in one data table with a verification date, and re-check them each release.
- **Dual licensing:** the code is MIT today, and MIT stays one of the two options, so existing users and any outside MIT contributions remain compatible.
- **Intel-sync bot:** its path changes must land in the same PR as the Phase 0 move, or the weekly job breaks.

## Order and dependencies

Phase 0 → 1 → (2 → 3 and 2 → 4 can run in parallel) → 5 → 6, with 7 built up alongside 1–5. Phase 1 unblocks the most: marketplace listings, the website rework and Themis mode 1 all depend on a clean Aegis.
