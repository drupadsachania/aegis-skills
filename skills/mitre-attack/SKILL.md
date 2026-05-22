---
name: mitre-attack
version: 1.0.0
description: >
  MITRE ATT&CK threat modelling workflow. Triggers for: adversary TTP mapping,
  threat actor profiling, kill chain analysis, technique selection for security
  controls, ATT&CK Navigator usage, ICS/OT threat modelling, ATT&CK-based
  detection gap analysis, or any exercise requiring adversary behaviour mapping.
frameworks: [mitre-attack]
tags: [security, threat-intelligence, ttp, mitre, attack-framework]
phases:
  - id: enterprise-matrix-overview
    ref: references/enterprise-matrix-overview.md
    lazy: true
  - id: ics-matrix-overview
    ref: references/ics-matrix-overview.md
    lazy: true
  - id: ttp-profiling-guide
    ref: references/ttp-profiling-guide.md
    lazy: true
tools: [read, search]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack]
  red-team: false
---

# MITRE ATT&CK Skill

## Purpose

Map adversary behaviour to ATT&CK techniques. Use this skill to build structured threat models,
identify detection gaps, and feed technique selections into deception engineering or security
control design.

## Phase Map

```
Phase 0 → Identify adversary archetype and scope (Enterprise / ICS / Mobile)
Phase 1 → Enterprise matrix orientation    [read: references/enterprise-matrix-overview.md]
Phase 2 → ICS matrix orientation (OT only) [read: references/ics-matrix-overview.md]
Phase 3 → TTP profiling                    [read: references/ttp-profiling-guide.md]
Phase 4 → Output: threat model with top 7 technique IDs + kill chain positions
```

## Phase 0 — Scope and Adversary Archetype

Before loading any matrix reference, establish:

1. **Environment type**: Enterprise (IT), ICS/OT, Cloud, Mobile, or hybrid
2. **Adversary archetype**: Nation-state APT / Cybercriminal / Insider / Hacktivist
3. **Industry vertical**: Determines which threat actor groups are most relevant
4. **Goal of the exercise**: Detection gap analysis / deception placement / control design / incident response

Map the archetype to likely technique clusters. Proceed to Phase 1 (Enterprise) or Phase 2 (ICS) as appropriate.

## Output Format

Every ATT&CK session produces a threat model table:

| Technique ID | Name | Tactic | Kill Chain Position | Priority |
|---|---|---|---|---|
| T1078 | Valid Accounts | Persistence, Privilege Escalation | Mid-stage | High |

Feed this table directly into `mitre-engage` or `deception-engineering` for deception placement.
