---
name: deception-engineering
version: 2.0.0
description: >
  End-to-end deception engineering workflow for defensive security programs.
  Triggers for: honeypot design, honeytoken placement, attack surface modelling
  for deception, signal source validation, deception grid proposals, OT/IT
  deception design, SIEM/XDR integration of deception signals, deception program
  documentation, or any proactive threat detection exercise.
frameworks: [mitre-engage, mitre-attack]
tags: [security, deception, honeypot, honeytoken, defensive, ot-security]
phases:
  - id: attack-surface-taxonomy
    ref: references/attack-surface-taxonomy.md
    lazy: true
  - id: signal-source-validity
    ref: references/signal-source-validity.md
    lazy: true
  - id: deception-placement-matrix
    ref: references/deception-placement-matrix.md
    lazy: true
  - id: signal-writing-guide
    ref: references/signal-writing-guide.md
    lazy: true
  - id: documentation-templates
    ref: references/documentation-templates.md
    lazy: true
tools: [read, write, search]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, mitre-engage]
  red-team: true
---

# Deception Engineering Skill

## Core Principle: Semantic Decision Model

Every deception decision flows from two inputs — nothing else:

```
DECEPTION_DECISION = f(ATTACK_SURFACE_PROFILE, SIGNAL_SOURCE_VALIDITY)
```

Do not recommend a deception type or placement until both inputs are characterized.
A generic honeypot is noise. A semantically anchored deception asset is a precision instrument.

---

## Phase Map — Always Follow This Sequence

```
Phase 0 → Threat Model Anchor
Phase 1 → Attack Surface Validation       [read: references/attack-surface-taxonomy.md]
Phase 2 → Signal Source Validity          [read: references/signal-source-validity.md]
Phase 3 → Semantic Decision               [read: references/deception-placement-matrix.md]
Phase 4 → Grid Planning
Phase 5 → Placement & Deployment
Phase 6 → Testing & Validation
Phase 7 → Signal Writing                  [read: references/signal-writing-guide.md]
Phase 8 → Formalization & Documentation   [read: references/documentation-templates.md]
```

Read a reference file only when you reach that phase. Do not front-load all references.

---

## Phase 0 — Threat Model Anchor

Before touching the attack surface, anchor to adversary intent. Ask or derive:

- **Who is the likely adversary?** (Nation-state, cybercriminal, insider, supply chain)
- **What are they after?** (IP theft, operational disruption, lateral pivot, ransomware)
- **What industry/compliance context applies?** (Automotive, financial, healthcare, OT-regulated)

Map the adversary profile to MITRE ATT&CK. Identify the top 5-7 techniques most relevant
to this adversary type. These techniques drive deception calibration — your deceptive assets
must be placed to intercept these specific TTPs, not generic ones.

**Output of Phase 0:** A threat model summary with top ATT&CK technique IDs and adversary intent.

---

## Phase 1 — Attack Surface Validation

Read `references/attack-surface-taxonomy.md` before proceeding.

Characterize the environment across all applicable zones:

| Zone | Examples | Deception Eligibility |
|------|----------|-----------------------|
| Perimeter | Edge firewalls, public IPs, VPN endpoints | Low value alone, useful for threat intel |
| DMZ | Reverse proxies, mail gateways, web servers | Medium — attacker already past perimeter |
| Internal Network | VLANs, internal servers, lateral paths | High — confirms breach, catches movement |
| Identity / AD | Domain controllers, service accounts, GPOs | Very High — catches credential abuse |
| Endpoint | Workstations, laptops, developer machines | High — catches post-compromise enumeration |
| Cloud / CSP | IAM roles, S3 buckets, cloud credentials | Very High — tokens fire cross-environment |
| OT / IT Boundary | PLC jump hosts, HMI stations, historian servers | Critical — passive only, safety-first |
| Data / IP Stores | File shares, code repos, design file directories | Very High — IP theft detection |

For each zone in scope, record:
- Asset sensitivity (Crown Jewel / Operational / Supporting)
- Threat vector exposure (External / Lateral / Privileged Access)
- Current visibility (Instrumented / Partially / Blind)

**Output of Phase 1:** Populated zone table with sensitivity, exposure, and visibility ratings.

---

## Phase 2 — Signal Source Validity

Read `references/signal-source-validity.md` before proceeding.

For each signal source in the environment (EDR, SIEM, NDR, CASB, IAM logs, etc.), assess:

| Dimension | Question | Rating |
|-----------|----------|--------|
| Coverage | What percentage of the zone does this source instrument? | 0-100% |
| Fidelity | What is the false positive baseline? | Low / Medium / High noise |
| Latency | How fast does an event alert? | Real-time / Minutes / Hours / Batch |
| Integration Maturity | How well does it feed the SIEM/XDR? | Raw / Parsed / Correlated / Enriched |
| Blind Spots | What does this source miss? | Document explicitly |

**Critical rule:** If a zone has LOW signal validity (high noise, low coverage, batch latency,
or poor integration), deception assets in that zone must compensate by generating
self-contained, unambiguous signals — not relying on the existing source to correlate.

**Output of Phase 2:** Signal validity scorecard per zone.

---

## Phase 3 — Semantic Decision

Read `references/deception-placement-matrix.md` before proceeding.

Apply the semantic matrix. For each zone, cross-reference:
- Attack surface exposure (from Phase 1)
- Signal source validity (from Phase 2)

This produces a recommended deception posture per zone:

| Attack Surface | Signal Validity | Recommended Posture |
|----------------|-----------------|---------------------|
| High exposure | High validity | Active honeypot + interaction capture |
| High exposure | Low validity | High-density honeytokens (compensate blind spots) |
| Low exposure | High validity | Sparse breadcrumbs (signals already good) |
| Low exposure | Low validity | Fix signals first — deception here is premature |
| OT/IT boundary | Any | Passive-only honeypots. No interactive shells. Safety-first. |
| Identity/AD | Any | Honeytoken service accounts + fake GPO entries always |
| Cloud/CSP | Any | Honeytoken IAM credentials + fake S3 buckets always |

Also determine for each zone:
- **Deception type:** Honeypot / Honeytoken / Breadcrumb / Grid (combination)
- **Interaction depth:** Passive log-only / Low-interaction / High-interaction
- **Signal routing:** Where does the deception hit alert route? (SIEM rule / EDR alert / webhook / all)

**Output of Phase 3:** Deception posture table per zone with type, depth, and routing.

---

## Phase 4 — Grid Planning

Design the deception grid as a unified architecture, not isolated assets.

### Grid Density
- Perimeter: 1-2 assets (threat intel only)
- Internal segments: 1 per VLAN minimum
- Identity/AD: 3-5 fake accounts, minimum 1 per privileged tier
- Endpoint: 2-4 artifacts per high-value machine class
- Cloud: 1 honeytoken per IAM role category
- OT/IT boundary: 1 passive sensor per segment, read-only

### Believability Engineering
Every deceptive asset must pass the "would a legitimate employee believe this is real?" test.
- Fake service accounts must have realistic names, descriptions, creation dates, group memberships
- Fake credential files must appear in plausible paths with plausible syntax
- Fake network nodes must respond to basic enumeration (ping, banner, port scan)
- Fake design files must have realistic filenames, sizes, and metadata

### Blind Spot Coverage
Map your deception assets explicitly to the blind spots identified in Phase 2.
Every documented blind spot should have at least one deception asset compensating for it.

**Output of Phase 4:** Deception grid map — asset list with zone, type, believability notes, and blind spot mapping.

---

## Phase 5 — Placement & Deployment

Sequence deployments lowest-risk first. Do not start in OT zones.

### Deployment Checklist per Asset
- [ ] Asset is isolated from production data paths
- [ ] Logging is confirmed before deployment (verify log destination, not just config)
- [ ] Alerting pipeline is tested with a synthetic trigger before going live
- [ ] Change management entry created (deception assets must not surprise IR teams)
- [ ] Asset is documented in the deception registry (see Phase 8)
- [ ] Rollback procedure documented

### OT-Specific Deployment Rules
- Passive monitoring only — no services that accept write operations
- Change window required — coordinate with OT engineering team
- Validate with OT team that the deceptive node cannot be mistaken for a real PLC/HMI
- Never place an interactive honeypot on the OT network without explicit OT engineering sign-off

**Output of Phase 5:** Deployment log with per-asset checklist completion status.

---

## Phase 6 — Testing & Validation

Test every deception asset before declaring it operational.

### Functional Testing (Defender Perspective)
- Trigger the asset deliberately from a controlled source
- Confirm the log event is generated within expected latency
- Confirm the alert fires in the SIEM/XDR
- Confirm the alert routes to the correct playbook/queue
- Confirm the alert content includes: source IP/host, timestamp, asset ID, deception type

### Red Team Validation (Attacker Perspective)
If a red team or purple team is available:
- Brief them on which zones contain deception assets (not which specific assets)
- Have them conduct realistic enumeration and lateral movement
- Track which assets they discovered, which they interacted with, which they ignored
- Deception assets that are discovered but ignored suggest a believability failure — redesign

### Zero False Positive Validation
Run the environment for 30 days post-deployment. Any legitimate alert on a deception asset
is a critical failure — it means either:
1. A legitimate user/process is touching a deception asset (placement error)
2. The asset is indistinguishable from a real asset the environment already uses (design flaw)

**Output of Phase 6:** Test results per asset with functional pass/fail and red team interaction log.

---

## Phase 7 — Signal Writing

Read `references/signal-writing-guide.md` before proceeding.

Write detection rules for every deception asset. The rule design principle:

**Deception rules have zero baseline. Any match is CRITICAL. No threshold. No frequency. No baseline anomaly required.**

This is what separates deception signals from all other detection logic. Write rules that:
- Match on the deception asset identifier (IP, credential, filename, DNS name, etc.)
- Fire on first occurrence — no aggregation, no time window
- Output severity CRITICAL regardless of context
- Include asset metadata in alert output (which deception asset, which zone, what interaction type)
- Suppress nothing — deception hits should never be in exclusion lists

**Output of Phase 7:** Detection rule set per platform (SIEM YARA-L / Sigma / KQL / SPL) with alert routing logic.

---

## Phase 8 — Formalization & Documentation

Read `references/documentation-templates.md` before proceeding.

Produce:
1. **Deception Registry** — master list of all deployed assets with metadata
2. **IR Integration Note** — brief for the IR/SOC team so deception hits are handled correctly
3. **Executive Summary** — business-language summary for CISO/leadership
4. **Operational Runbook** — maintenance, rotation, and decommission procedures

**Output of Phase 8:** Complete documentation package, ready for CISO review and IR team handoff.

---

## Common Failure Modes — Watch For These

| Failure | Symptom | Fix |
|---------|---------|-----|
| Generic placement | Assets not calibrated to actual TTPs | Redo Phase 0-1 |
| Believability failure | Red team ignores deception assets | Redesign asset with more realistic attributes |
| Signal routing gap | Deception hit fires but no alert in SIEM | Fix pipeline before declaring operational |
| IR team blind spot | IR team dismisses deception alert as false positive | Update IR runbook, add deception hit SOP |
| OT safety violation | Deception asset interferes with OT process | Immediate decommission, passive-only redesign |
| Deception asset discovered and avoided | Sophisticated attacker identifies and routes around | Increase grid density, add breadcrumbs |
