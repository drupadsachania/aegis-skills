# Listing copy (single source)

Maintainer file. Every directory runbook in this folder takes its names, descriptions and keywords from here, so a change is made once. Nothing is published to npm or to any directory yet, so none of this copy describes a live listing.

Publisher name used on listings (an individual maintainer; no organisation): **Drupad Sachania** (<https://github.com/drupadsachania>). Project repository: <https://github.com/drupadsachania/aegis-skills>. Website: <https://aegis-skills.vercel.app>.

> DECIDED (owner, 2026-10-13, superseding 2026-10-12): the copyright and licence holder is **Drupad Sachania**. `LICENSE*`, `package.json` `author`, both `.claude-plugin/plugin.json` `author` fields and `.claude-plugin/marketplace.json` `owner` all say so. The repository URL `github.com/drupadsachania/aegis-skills` is only the repository location.

## Names and category

| Item | Value |
|---|---|
| Product names | Aegis (skills and read-only MCP server), Themis (governed security workflows) |
| Directory category | Security / Cybersecurity wherever a category is offered (`security` in the Claude marketplace file) |
| Positioning | Defensive cybersecurity for authorized use. Every skill states its purpose, an authorization assumption and what it will not do |
| Licence | Apache-2.0 OR MIT |

## Directory listing fields (Anthropic limits)

The Anthropic directory limits are: name 100 characters, tagline 55, description 2,000, one to five categories (<https://www.claude.com/docs/plugins/submit> and the connector submission page; the same limits are in the uploaded Anthropic guidelines). `scripts/tests/listing-copy.test.js` parses this table and the long descriptions below and fails when a limit is exceeded, when a listing has fewer than three example prompts, or when a ChatGPT or registry limit is exceeded.

| Product | Name | Tagline | Categories |
|---|---|---|---|
| Aegis | Aegis Security Skills | Defensive security skills for your AI | Security |
| Themis | Themis Security Operations | Governed security workflows on your own AI | Security |

## One-line descriptions (100 characters or fewer)

These are also the `server.json` descriptions, which the registry limits to 100 characters (`npm run check:registry` enforces it).

| Product | One line | Length |
|---|---|---|
| Aegis | Read-only library of 24 defensive cybersecurity skills: ATT&CK, ATLAS, DFIR, CTEM and more. | 91 |
| Themis | Governed security workflows on your own AI: audited tools, human-approved writes, no API key. | 93 |

Short forms for places with tighter limits (ChatGPT lists `displayName` and `shortDescription` as limited to 30 characters each):

| Product | Display name (30 or fewer) | Short description (30 or fewer) |
|---|---|---|
| Aegis | Aegis Security Skills | Defensive security skills |
| Themis | Themis Security Operations | Governed security workflows |

## Long descriptions

### Aegis

Aegis is a library of 24 defensive cybersecurity skills for AI assistants. Each skill is a structured methodology for a security job: mapping adversary behaviour with MITRE ATT&CK, ATLAS and Engage, threat hunting, digital forensics and incident response, exposure validation, attack surface mapping, identity and access management, endpoint, network and infrastructure security, operational technology, compliance, governance and risk management, and more.

Every skill opens with a scope-and-authorization section: a defensive purpose, an assumption that you only use it on systems you own or are explicitly authorized to assess, and what it will not do. Aegis is guidance for defenders. It does not run scans, execute anything or reach other systems.

The hosted Aegis MCP server has three read-only tools (`list_skills`, `get_skill`, `get_skill_phase`). It needs no sign-in, makes no model calls and stores nothing. The same skills install into Claude, Codex, Gemini, Cursor, VS Code and Antigravity with the `aegis` command.

(about 1,030 characters)

### Themis

Themis runs security workflows on your own AI assistant, with the controls a security team expects. It plans a task into steps, proposes calls to the security tools you connect, and writes an audit trail of every step. Every tool call, read included, is a proposal that only a human can approve, and a model cannot approve its own actions.

Tool output is redacted and marked as untrusted before the model sees it, each tool server has a call budget, and each skill gets a default-deny tool allowlist. The Themis plugin uses the AI assistant you already have, so it needs no API key. A separate local app offers a dashboard for approvals, the audit log and reports, and keeps its data on your machine.

Themis is for authorized defensive work. It carries the Aegis skills' scope-and-authorization rules, and it is not a certification or a substitute for your own review.

(about 890 characters)

## Example prompts (at least three per listing)

The Anthropic directory requires at least three working example prompts. Aegis prompts are taken from `docs/themis/test-prompts.md` (each has a verified expected tool call). Themis prompts are workflow requests for the plugin and are not part of the hosted-server test set.

### Aegis prompts

- What security skills are available?
- Show me the compliance skill.
- Open the exposure-validation authorization phase.
- Which skill covers MITRE ATT&CK?

### Themis prompts

- Start a Themis run to assess the exposure of our staging web application, using only the tools I have connected.
- Which Aegis skill and phase should a Themis run use to triage a suspected phishing incident?
- Show the audit log and pending approvals for my latest Themis run.

## Keywords

cybersecurity, security, defensive security, blue team, MITRE ATT&CK, MITRE ATLAS, MITRE Engage, DFIR, digital forensics, incident response, threat hunting, threat intelligence, threat modeling, exposure validation, attack surface, compliance, GRC, risk management, identity and access management, OT security, SOC, agent skills, MCP.

Do not use: offensive, exploit, hacking, red team, bypass. The copy is about authorized, defensive use and the keywords should say the same.

## Reviewer-facing facts (reuse verbatim)

- Hosted Aegis MCP: `https://aegis-skills.vercel.app/api/mcp`, Streamable HTTP, stateless, no authentication, three tools, all read-only.
- All three tools carry `title`, `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`.
- Rate limit: best-effort, 120 requests a minute per client IP, per server instance; Anthropic's published outbound range is exempt. It is not a hard quota on serverless hosting.
- Privacy policy: <https://aegis-skills.vercel.app/docs/themis/privacy-policy> (contact: privacy@kairos-foundation.org).
- Reviewer test prompts: <https://aegis-skills.vercel.app/docs/themis/test-prompts>.
- Dual-use review and compliance mapping: `docs/themis/dual-use-review.md`, `docs/themis/compliance/`.
- Support contact: support@kairos-foundation.org. Privacy contact: privacy@kairos-foundation.org. Security reports: GitHub private vulnerability reporting (SECURITY.md), the only security channel, not email. USER ACTION: send and confirm a test message to both addresses before submitting; see [README.md](README.md).

Check before using any link above: the site is not deployed from this branch yet, so these URLs only resolve after the Vercel step in the project's user actions.

## Name collision check (USER ACTION)

Search each directory for "Aegis" and "Themis" before submitting. Both are common names. The Anthropic plugin checklist holds a name that looks like an existing listing or brand for a reviewer, and blocks a name another organization already uses. If a name is taken, the technical identifiers (`aegis-skills`, `@aegis-skills/themis-plugin`) can stay and only the display name changes.
