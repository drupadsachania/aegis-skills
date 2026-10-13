# Phase 6 — Compliance & Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the compliance documentation, threat model, dual-use review, and marketplace-listing assets that let Aegis and Themis be listed — as cybersecurity tools — in the Anthropic plugin and Connectors directories, the ChatGPT app directory, the Gemini extensions gallery, and the MCP Registry. Plus the directory-required code changes that earlier phases did not already make.

**Architecture:** Mostly documentation and metadata under `docs/themis/compliance/`, `docs/themis/`, and per-package `server.json`, with a small set of code changes to the hosted Aegis MCP route and a lint-rule addition. The ChatGPT bundle *script* is built in Phase 7; this phase supplies its *content* and the submission runbooks. No offensive technique content is produced; the dual-use review is policy-level only.

**Tech Stack:** Markdown docs, CommonJS scripts (per contracts §4), the existing Next.js hosted MCP route (`apps/web/app/api/mcp`).

---

## Preconditions

- [ ] **P1. Branch.** This phase has two natural branches; do them in order on one branch unless noted: `git checkout main && git pull && git checkout -b restructure/phase-6-compliance-listings`.
- [ ] **P2. Phase dependencies.**
  - Compliance docs and the threat model (Tasks 1–3) need **Phase 2 merged** (the governance code they cite exists at its final path).
  - The dual-use review and lint rule (Task 4) need **Phase 1 merged** (the 24 skills and `scripts/lint-skills.js`).
  - The hosted-MCP code changes (Task 6) need **Phase 5 merged** (the website that owns `app/api/mcp`).
  - The listing runbooks' *Themis* entries (Task 8) are blocked until **Phase 7 publishes** the packages (finding 6.2). Aegis-only listings can proceed after Phases 1 and 5.
  If a required phase is unmerged when you reach its task, do that task's branch later; do not fabricate paths.
- [ ] **P3. Baseline.** `npx jest 2>&1 | tail -n 5`; record counts. Only Task 6 adds tests; the rest is docs.
- [ ] **P4. Confirm the governance files exist at their Phase-2 paths before citing them** (any miss is a STOP — re-locate, do not guess a path):
  ```bash
  for f in packages/themis-core/src/mcp/tool-policy.ts packages/themis-core/src/mcp/config.ts \
           packages/themis-core/src/secrets.ts packages/themis-core/src/sanitise.ts \
           packages/themis-gateway/src/gateway.ts packages/themis-core/src/approvals.ts \
           packages/aegis/mcp/server.js; do
    test -f "$f" && echo "ok $f" || echo "MISSING $f"
  done
  ```
  > Phase 2 may have split some files differently (e.g. guardrail/exposure rules into `*-rules.ts`). If a path differs, record the actual path from the Phase 2 plan's extraction table and cite that. STOP only if a cited control cannot be found anywhere.

---

## Verified external facts

Fill these in at execution time and STOP if a source cannot be reached (do not cite from memory). Capture URL + retrieval date inline in each doc.

- [ ] **F1. OWASP Top 10 for LLM Applications** — current list and IDs (the 2025 list uses IDs `LLM01`–`LLM10`). Source: genai.owasp.org. Record the exact 10 titles/IDs in `docs/themis/compliance/owasp-llm.md`.
- [ ] **F2. OWASP Agentic security guidance** — the current "Agentic AI – Threats and Mitigations" / Agentic Top-threats list (IDs differ from the LLM list; do not merge them). Source: genai.owasp.org. Record the threat list used.
- [ ] **F3. NIST AI RMF 1.0** functions (GOVERN, MAP, MEASURE, MANAGE) and the Generative AI Profile (NIST AI 600-1) action IDs you map to. Source: nist.gov.
- [ ] **F4. MITRE ATLAS** tactics and the technique IDs you reference (verify against atlas.mitre.org; Phase 1 already corrected the skill to the 2026.09 data — reuse that version).
- [ ] **F5. ChatGPT app/plugin submission** (developers.openai.com/apps-sdk/app-submission-guidelines and the plugin submission page). As of 2026-10-08 the exact manifest/bundle schema is **not** fully published; capture what the official pages state (org verification, domain verification, reviewer test account with sample data and no MFA, tool-description rules, privacy policy required) and treat the exact bundle file layout as a USER-ACTION verification against Developer Mode — **do not invent the manifest schema**. Note the official caveat that plugin ZIPs containing lifecycle hooks may be rejected.
- [ ] **F6. Anthropic Connectors directory** requirements for a remote MCP server (transport, auth/authless policy, tool annotations, review). Source: Anthropic docs.
- [ ] **F7. Gemini extensions gallery** listing mechanism (public GitHub repo + `gemini-extension.json`; gallery submission). Source: geminicli.com / google docs. Reconcile with finding 6.8 (manifest at repo root or release-archive root).
- [ ] **F8. MCP Registry** `server.json` schema + namespace auth (`io.github.<user>/...` via the `mcp-publisher` CLI and GitHub auth). Source: registry.modelcontextprotocol.io / the registry repo.

---

## File Structure

```
docs/themis/compliance/
├─ owasp-llm.md            NEW  risk → control → code path → test → residual gap
├─ owasp-agentic.md        NEW  same table shape, agentic threat list
├─ nist-ai-rmf.md          NEW  RMF function/action → control → evidence
└─ README.md               NEW  index + how these map together
docs/themis/
├─ threat-model-atlas.md   NEW  ATLAS-based threat model of Themis
├─ privacy-policy.md        NEW  site + hosted MCP data handling
├─ test-prompts.md         NEW  reviewer prompts with expected tool calls
└─ dual-use-review.md      NEW  policy-level scope review of the 24 skills
docs/listings/
├─ anthropic-plugin.md     NEW  runbook + copy
├─ anthropic-connectors.md NEW  runbook + copy
├─ chatgpt-app.md          NEW  runbook + copy (schema = USER verify)
├─ gemini-gallery.md       NEW  runbook + copy
├─ mcp-registry.md         NEW  runbook + copy
└─ listing-copy.md         NEW  one source of names/descriptions/keywords
```

Also modified: `apps/web/app/api/mcp/route.ts` and a new `apps/web/app/.well-known/openai-apps-challenge/route.ts` (Task 6); `scripts/lint-skills.js` (Task 4b); each `server.json` (Task 7); `packages/aegis/mcp/server.js` tool annotations (Task 6).

---

## Tasks

### Task 1 — Compliance mapping docs (executor: sonnet)

**Files:** `docs/themis/compliance/{owasp-llm.md,owasp-agentic.md,nist-ai-rmf.md,README.md}`

Each mapping is a table: **risk/function → Themis control → code path (file:symbol) → test that proves it → residual risk/gap**. Mark honest gaps as `GAP` rows; never claim a control that is not implemented. Use this exact column header in every table:

```
| ID | Risk | Themis control | Code path (file:symbol) | Test | Residual / gap |
```

- [ ] **1.1** `owasp-llm.md`. Start the file with the verified source line (F1 URL + date), then the table. These rows are written for you — complete the `Test` cells from the actual test file names in each package (read them) and verify each `Code path` against P4 (if a path differs, use the real one; if a control is absent, change the row to a `GAP`):
  | ID | Risk | Themis control | Code path | Test | Residual / gap |
  |---|---|---|---|---|---|
  | LLM01 | Prompt injection (incl. via tool output) | External tool output is redacted and wrapped as untrusted before it reaches the model; the wrapper closing-tag is neutralised | `themis-gateway/src/gateway.ts` (wrap+escape), `themis-core/src/secrets.ts:redactSecrets` | gateway wrapper/redaction tests (name from the package) | If finding 6.6 wrapper-breakout fix not merged → `GAP`, see Task 6.3 |
  | LLM02 | Sensitive information disclosure | Secret redaction on all tool args, results and audit data | `themis-core/src/secrets.ts:redactSecrets`, `redactDeep` | secrets tests | — |
  | LLM05 | Improper output handling | Task input sanitised; tool output never executed, only surfaced | `themis-core/src/sanitise.ts:sanitiseTask` | sanitise tests | — |
  | LLM06 | Excessive agency | Writes/executes are propose-only; a human approves via elicitation; model output can never approve | `themis-core/src/approvals.ts:canExecuteApproval`; plugin `src/approval.ts`; app dashboard approve route | approval-invariant tests (Phase 2/3/4) | — |
  | LLM06 | Excessive agency (tool scope) | Per-skill tool allowlist; default-deny; write exposure gated by `allowWrite` | `themis-core/src/mcp/config.ts`, `mcp/tool-policy.ts:classifyTool,dispositionFor` | governance tests | — |
  | LLM08 | Excessive resource use | Per-run external-call budget | `themis-gateway/src/gateway.ts:callCount`/budget | gateway budget test | — |
  | LLM03 | Supply chain | Pinned deps, npm provenance, deterministic engine has no network/model deps | Phase 7 `release.yml`; `scripts/check-deps-themis.js` | CI dep-guard | Intel content is committed locally by the maintainer (finding 0.5) — note as a trust assumption |
  Add one row per remaining `LLM0x` item from F1; `GAP` where nothing applies. Do not invent a control to fill a row.
- [ ] **1.2** `owasp-agentic.md` against the F2 agentic threat list. Written rows (complete `Test`/verify paths as above):
  | ID | Risk | Themis control | Code path | Test | Residual / gap |
  |---|---|---|---|---|---|
  | (agentic) | Unauthorized tool invocation | Human-only approval gate; deterministic (non-LLM) policy engine decides class | `themis-core/src/approvals.ts`, `mcp/tool-policy.ts` | approval-invariant tests | — |
  | (agentic) | Excessive autonomy / runaway loops | Fixed workflow graph with guards; `MAX_SUBTASKS`; sequential `advance` | `themis-core` `THEMIS_WORKFLOW`, `scheduleStage` | workflow tests | — |
  | (agentic) | Untraceable actions | Append-only audit log of every step, tool call, approval decision and finding | `themis-core` audit events (`auditEvent`, store `appendAudit`) | store/audit tests | — |
  | (agentic) | Cascading multi-agent failure | Dependency-staged scheduling; a failed sub-task does not auto-advance the join | `themis-core:scheduleStage,readySubTasks` | scheduler tests | — |
  Use the actual F2 IDs/titles; keep this list separate from LLM (different IDs).
- [ ] **1.3** `nist-ai-rmf.md`: one table keyed by RMF function (GOVERN/MAP/MEASURE/MANAGE) and the GenAI-Profile action IDs from F3 → the control and the evidence (the tests, the audit log, this doc set). Written seed rows: GOVERN → documented approval policy + this compliance set; MAP → the ATLAS threat model (Task 2); MEASURE → the test suites + audit trail; MANAGE → human approval gate + per-skill allowlist. Expand to the F3 action IDs.
- [ ] **1.4** `README.md` index: ATLAS (Task 2) is Themis's own threat model; OWASP/NIST are the responsible-design mappings shown to reviewers (decision 9). `git commit -m "docs(compliance): OWASP LLM/Agentic and NIST AI RMF control mappings"`.

### Task 2 — ATLAS threat model (executor: sonnet)

**Files:** `docs/themis/threat-model-atlas.md`

- [ ] **2.1** Document assets and trust boundaries: host AI ↔ themis-plugin (Mode 1); dashboard ↔ browser (Mode 2); gateway ↔ external MCP servers; the Aegis content supply chain including the weekly intel-sync committed from the maintainer's machine (finding 0.5).
- [ ] **2.2** For each relevant ATLAS tactic, state the threat to Themis, the implemented mitigation (cite code), and the residual gap → a follow-up issue. Emphasise prompt-injection-via-tool-output, unauthorized tool execution, and model-driven approval bypass (all mitigated by the approval invariant and gateway wrapping).
- [ ] **2.3** Commit.

### Task 3 — Privacy policy & reviewer test prompts (executor: haiku)

**Files:** `docs/themis/{privacy-policy.md,test-prompts.md}`

- [ ] **3.1** `privacy-policy.md`: state that Mode 2 (`themis-app`) keeps all data local (`~/.themis/`), that the plugin (Mode 1) stores run state locally, and what the **hosted Aegis MCP** logs. Read `apps/web/app/api/mcp/route.ts` and any telemetry remaining after Phase 5 to describe retention truthfully. Leave the contact as `<!-- USER: privacy contact email -->`.
- [ ] **3.2** `test-prompts.md`: reviewer prompts for the hosted Aegis MCP, each with the expected read-only tool call and result shape, plus a note that no auth/sign-in is required. Write these ten (adjust tool/skill names to the real ones if they differ), each as a row `Prompt → expected tool call → expected result`:
  1. "What security skills are available?" → `list_skills` → array of 24 skills with slug + description.
  2. "Show me the compliance skill." → `get_skill {name:'compliance'}` → the skill manifest (frameworks, phases).
  3. "What phases does malware-analysis have?" → `get_skill {name:'malware-analysis'}` → phase list.
  4. "Open the exposure-validation authorization phase." → `get_skill_phase {name:'exposure-validation', phase:'validation-authorization-and-scope'}` → phase markdown.
  5. "Which skill covers MITRE ATT&CK?" → `list_skills` then `get_skill {name:'mitre-attack'}` → manifest.
  6. "Give me the threat-modeling scope-definition phase." → `get_skill_phase {...}` → phase markdown.
  7. "List skills in the threat-intel family." → `list_skills` (client filters by family).
  8. "Does a skill exist for OT/ICS security?" → `get_skill {name:'operational-technology'}` → manifest.
  9. "Show network-security traffic-analysis guidance." → `get_skill_phase {...}` → phase markdown.
  10. "What does the digital-forensics skill do?" → `get_skill {name:'digital-forensics'}` → manifest with scope-and-authorization.
  End with: "No sign-in, account, or credentials are required; all tools are read-only." Commit.

### Task 4 — Dual-use review (policy level) + lint rule (executor: sonnet)

**Files:** `docs/themis/dual-use-review.md`, `scripts/lint-skills.js` (extend)

> Policy-level only: scope wording, what reviewers flag, and the lint rule. Do **not** document offensive techniques.

- [ ] **4.1** `dual-use-review.md`: for each of the 24 skills (read each `SKILL.md` "Scope and authorization" section from Phase 1), record one row: skill, whether its scope block states (a) a defensive purpose, (b) an explicit authorization assumption, (c) out-of-scope limits. Flag any skill missing one. The higher-scrutiny skills (malware-analysis, reverse-engineering, deception-engineering, exposure-validation, threat-hunting, digital-forensics) must have all three. Where one is missing, the fix is a wording change to that skill's scope block (a Phase-1-style content edit) — list the exact missing element, not the technique.
- [ ] **4.2** Add a reviewer-facing summary: what the Anthropic/OpenAI directories check for in security tooling (authorization framing, no operational attack instructions, defensive intent) and how each skill satisfies it.
- [ ] **4.3 (TDD)** Extend `scripts/lint-skills.js` with a scope-block rule. First add the fixture test (complete) to Phase 1's skill-lint test file (or a new `scripts/__tests__/lint-skills-scope.test.js`):
  ```js
  const { checkScopeBlock } = require('../lint-skills')
  const GOOD = `## Scope and authorization\n- Purpose: defensive mapping\n- Use only on systems you own or are explicitly authorized to assess.\n- Out of scope: unauthorized targets\n`
  test('passes when all three scope lines are present', () => {
    expect(checkScopeBlock(GOOD)).toEqual([])
  })
  test('flags a missing authorization line', () => {
    const body = `## Scope and authorization\n- Purpose: x\n- Out of scope: y\n`
    expect(checkScopeBlock(body)).toContain('missing authorization line')
  })
  test('flags a missing scope section entirely', () => {
    expect(checkScopeBlock('## Overview\n')).toContain('missing "Scope and authorization" section')
  })
  ```
  Run red. Then add to `scripts/lint-skills.js` (complete) and call it from the per-skill lint loop, pushing any returned problems into the skill's error list:
  ```js
  function checkScopeBlock (body) {
    const problems = []
    const m = body.match(/##\s*Scope and authorization\s*\n([\s\S]*?)(?=\n##\s|\s*$)/i)
    if (!m) { problems.push('missing "Scope and authorization" section'); return problems }
    const section = m[1]
    if (!/(^|\n)\s*-\s*Purpose\s*:/i.test(section)) problems.push('missing purpose line')
    if (!/authoriz/i.test(section)) problems.push('missing authorization line')
    if (!/out of scope/i.test(section)) problems.push('missing out-of-scope line')
    return problems
  }
  module.exports.checkScopeBlock = checkScopeBlock
  ```
  Run green. Every one of the 24 skills must pass (Phase 1 added the sections); any failure is a wording fix to that skill (Task 4.1 lists which element is missing) — not a technique addition.
- [ ] **4.4** Commit: `git commit -m "docs+lint(skills): dual-use scope review and scope-block lint rule"`.

**STOP** if writing this requires describing how any offensive technique works — it does not; keep to scope/authorization wording.

### Task 5 — Listing copy, one source (executor: haiku)

**Files:** `docs/listings/listing-copy.md`

- [ ] **5.1** Write the canonical listing copy reused across every directory: product names (Aegis, Themis), one-line (≤100 char) and long descriptions, category = **Security / Cybersecurity** wherever offered, keyword list, and the `server.json` ≤100-char descriptions. Emphasise defensive cybersecurity and authorized use. Commit.

### Task 6 — Directory-required code changes to the hosted MCP (executor: sonnet)

**Files:** `apps/web/app/api/mcp/route.ts`, `apps/web/app/.well-known/openai-apps-challenge/route.ts`, `packages/aegis/mcp/server.js`, tests

> These are the code changes directory review requires that no earlier phase made (findings 6.5, 6.6 already in Phase 2 for the gateway — here it is the hosted read-only server).

- [ ] **6.1 (TDD)** Add `annotations.title` to every tool in `packages/aegis/mcp/server.js` (`list_skills`, `get_skill`, `get_skill_phase`) alongside the existing `READ_ONLY` annotation set — e.g. merge `title: 'List security skills'` etc. into each tool's annotations object. Extend `__tests__/mcp/aegis-server.test.ts` to assert each advertised tool carries a non-empty `annotations.title`. Red → green.
- [ ] **6.2** Rate-limit the hosted `apps/web/app/api/mcp/route.ts`, **exempting Anthropic's egress range `160.79.104.0/21`** (finding 6.5). Add a small helper and a test (complete helper; wire it as the first lines of the POST handler before dispatch):
  ```ts
  // apps/web/lib/rate-limit.ts
  const WINDOW_MS = 60_000, MAX = 120
  const hits = new Map<string, { n: number; reset: number }>()
  // Anthropic egress (verify current range at execution; finding 6.5).
  const EXEMPT_CIDR = { base: ipToInt('160.79.104.0'), bits: 21 }
  function ipToInt (ip: string) { return ip.split('.').reduce((a, o) => (a << 8) + (+o | 0), 0) >>> 0 }
  export function isExempt (ip: string): boolean {
    const v = ipToInt(ip); const mask = EXEMPT_CIDR.bits === 0 ? 0 : (~0 << (32 - EXEMPT_CIDR.bits)) >>> 0
    return (v & mask) === (EXEMPT_CIDR.base & mask)
  }
  export function rateLimited (ip: string, now = Date.now()): boolean {
    if (isExempt(ip)) return false
    const e = hits.get(ip)
    if (!e || now > e.reset) { hits.set(ip, { n: 1, reset: now + WINDOW_MS }); return false }
    e.n += 1; return e.n > MAX
  }
  ```
  Test `apps/web/__tests__/rate-limit.test.ts`: `isExempt('160.79.104.5')===true`, `isExempt('8.8.8.8')===false`, and `rateLimited` returns true only after `MAX` non-exempt calls in the window. In the route, derive the client IP from the platform header (`x-forwarded-for` first hop on Vercel), and on `rateLimited` return HTTP 429. Verify the CIDR against Anthropic's current published egress docs at execution time; if changed, use the new value and note it.
- [ ] **6.3** Confirm the gateway wrapper-breakout fix (finding 6.6) is merged in Phase 2; if the `GAP` row in Task 1.1 is still open, **STOP** — no directory submission with a known prompt-injection breakout.
- [ ] **6.4** Add `apps/web/app/.well-known/openai-apps-challenge/route.ts` (complete):
  ```ts
  export const dynamic = 'force-static'
  export async function GET () {
    const token = process.env.OPENAI_APPS_CHALLENGE ?? ''
    return new Response(token, { status: token ? 200 : 404, headers: { 'content-type': 'text/plain' } })
  }
  ```
  The exact token is issued by OpenAI at submission; serving it from `OPENAI_APPS_CHALLENGE` is a USER ACTION. Test (with the app's route-test harness) that it returns the env value and 404 when unset.
- [ ] **6.5** Commit: `git commit -m "feat(web,aegis-mcp): tool titles, rate-limit exemption, ChatGPT domain-verification route"`.

### Task 7 — server.json / mcpName verification (executor: haiku)

**Files:** `packages/aegis/server.json`, `packages/themis-plugin/server.json`

- [ ] **7.1** Assert both `server.json` descriptions are ≤100 chars and both packages declare `mcpName` (a tiny node check; wire into `scripts/check-deps.js` or a standalone `scripts/check-registry-meta.js` run in CI). Confirm the `io.github.drupadsachania/...` namespace matches the GitHub account that will authenticate to the registry.
- [ ] **7.2** Commit.

### Task 8 — Per-directory listing runbooks (executor: sonnet) + submissions (USER)

**Files:** `docs/listings/{anthropic-plugin.md,anthropic-connectors.md,chatgpt-app.md,gemini-gallery.md,mcp-registry.md}`

Each runbook = numbered USER ACTIONS with the exact assets required (from F5–F8 and Task 5 copy), review prerequisites, and what blocks it.

- [ ] **8.1** `anthropic-plugin.md`: listing the Aegis and Themis **plugins** via the marketplace repo; note exact-version pins required (finding 6.1) and that the Themis plugin listing waits for Phase 7 publish (finding 6.2).
- [ ] **8.2** `anthropic-connectors.md`: listing the **hosted Aegis MCP** (`https://aegis-skills.vercel.app/api/mcp`); transport, authless read-only policy, tool annotations (Task 6.1), privacy URL.
- [ ] **8.3** `chatgpt-app.md`: org + domain verification (Task 6.4), the Developer-Mode test flow, reviewer test prompts (Task 3.2), privacy policy; mark the **exact bundle schema as USER-verify against Developer Mode** (F5) — the Phase 7 `scripts/build-chatgpt-bundle.js` produces the ZIP, this runbook says what to put in it and how to submit, and flags the lifecycle-hooks rejection caveat.
- [ ] **8.4** `gemini-gallery.md`: public repo + `gemini-extension.json` at the repo/archive root (finding 6.8), gallery submission.
- [ ] **8.5** `mcp-registry.md`: `mcp-publisher` CLI, GitHub namespace auth, `server.json` submission for both servers.
- [ ] **8.6** Commit, push, open the PR. Opening the PR is the executor's last step.

---

## Caveats & Pitfalls

- **Keep OWASP LLM and OWASP Agentic separate.** Different lists, different IDs; merging them produces a wrong mapping.
- **Don't invent the ChatGPT bundle schema.** It is not fully published; verify in Developer Mode or leave it a USER action. The *script* is Phase 7's; this phase owns the *content and runbook*.
- **ATLAS is the threat model, OWASP/NIST are the design mapping** — don't conflate (decision 9).
- **Honest gaps.** A compliance table that claims controls Themis lacks will fail review harder than one with marked gaps. Mark `GAP` and link the follow-up.
- **Dual-use stays policy-level.** Scope wording and reviewer criteria only; no technique detail.
- **Exact pins everywhere** in anything submitted (finding 6.1).
- **Name collisions.** "Aegis"/"Themis" may already be taken in a directory (finding 6.10) — a USER check before submission.

## STOP conditions (in addition to contracts §1)

- A cited control's code path cannot be found (P4).
- An external requirement source (F1–F8) cannot be reached — do not cite from memory.
- The gateway wrapper-breakout fix (6.6) is not in before a submission runbook is marked ready (6.3).
- Writing any section would require offensive technique detail (4.x).

## USER ACTIONS

1. **Privacy contact email** in `privacy-policy.md`.
2. **Anthropic egress range** — confirm `160.79.104.0/21` is current (Task 6.2).
3. **`OPENAI_APPS_CHALLENGE`** env var on Vercel at ChatGPT submission (Task 6.4).
4. **Name-collision check** for "Aegis"/"Themis" in each directory (finding 6.10).
5. **The submissions themselves** (Task 8): all require a human account, verification, and review; several wait on the Phase 7 npm publish.
6. **Merge the PR.**

## Out of scope (other phases)

- The ChatGPT bundle build script and release archives — Phase 7.
- The gateway wrapper-breakout fix itself — Phase 2 (this phase only verifies and cites it).
- Publishing packages — Phase 7.

## Exit checklist

- [ ] `docs/themis/compliance/*` and `threat-model-atlas.md` complete, every control row citing a real `file:symbol` and a test, gaps marked.
- [ ] `dual-use-review.md` covers all 24 skills; the six higher-scrutiny skills have all three scope elements; `scripts/lint-skills.js` enforces the scope block and its test is green.
- [ ] `privacy-policy.md`, `test-prompts.md`, `listing-copy.md` complete.
- [ ] Task 6 code changes merged with tests green; `npx jest` no worse than P3 baseline.
- [ ] Both `server.json` ≤100-char descriptions and `mcpName` present; CI meta check passes.
- [ ] Five listing runbooks complete with USER ACTIONS and blockers noted.
- [ ] PR open against `main`; USER ACTIONS 1–6 handed over.
