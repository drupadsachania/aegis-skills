---
name: threat-intel-synthesis
version: 1.0.0
description: >
  Turn raw threat intelligence — news feeds, knowledge graphs, vendor advisories, and
  incident teardowns — into structured attack patterns, reconstructed incident narratives,
  and attack-surface coverage maps that drive detection and control decisions. Triggers
  for: threat intel analysis, attack pattern extraction, incident reconstruction, "what
  actually happened" analysis, ATT&CK mapping from reporting, threat landscape review,
  coverage gap analysis, intel-driven detection engineering, or weekly threat recap.
frameworks: [mitre-attack, mitre-atlas, diamond-model, kill-chain]
tags: [security, threat-intelligence, attack-patterns, incident-reconstruction, coverage-mapping, detection-engineering, cti, ttp]
phases:
  - id: intel-ingestion
    ref: references/intel-ingestion.md
    lazy: false
  - id: attack-pattern-extraction
    ref: references/attack-pattern-extraction.md
    lazy: true
  - id: incident-reconstruction
    ref: references/incident-reconstruction.md
    lazy: true
  - id: attack-surface-coverage
    ref: references/attack-surface-coverage.md
    lazy: true
  - id: intel-to-detection
    ref: references/intel-to-detection.md
    lazy: true
  - id: continuous-learning-loop
    ref: references/continuous-learning-loop.md
    lazy: true
  - id: live-threat-intel
    ref: references/live-threat-intel.md
    lazy: true
    auto: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, nvd-cve-feed, cisa-advisories, cybersec-news-digest]
  red-team: false
self-learning:
  update-frequency: weekly
  sources: [mitre-attack-stix, cisa-kev, cybersec-news-digest, attack-breakdowns]
  health-score: 1.0
  stale-threshold-days: 30
  coverage-gaps: []
context:
  environments: [enterprise, cloud, saas, hybrid, ot, endpoint]
  industry-verticals: [financial-services, healthcare, technology, government, critical-infrastructure, manufacturing]
  attack-surface-tags: [threat-intel, attack-patterns, coverage-mapping, detection-engineering, emerging-threats]
---

# Threat Intelligence Synthesis Skill

Raw threat intelligence is not knowledge. A feed of headlines, CVEs, and actor names
becomes useful only when it is converted into **repeatable attack patterns**, a
**reconstruction of what actually happened**, and an honest **map of what you do and do
not cover**. This skill performs that conversion, and feeds the result back into the
rest of the skill library.

## Core Principle

Intelligence is only actionable when it changes a decision. Every synthesis run must end
with one of: a new detection, a closed coverage gap, a revised control priority, or an
explicit "no change — already covered." An intel summary that changes nothing is noise
with citations.

## Phase Map

```
Phase 1 → Intel Ingestion & Normalisation  [read: references/intel-ingestion.md]
Phase 2 → Attack Pattern Extraction        [read: references/attack-pattern-extraction.md]
Phase 3 → Incident Reconstruction          [read: references/incident-reconstruction.md]
Phase 4 → Attack Surface Coverage Mapping  [read: references/attack-surface-coverage.md]
Phase 5 → Intel → Detection Engineering    [read: references/intel-to-detection.md]
Phase 6 → Continuous Learning Loop         [read: references/continuous-learning-loop.md]
```

## Analytic Discipline (applies to every phase)

- **Separate observation from inference.** State what a source reported, then what you
  concluded. Never let a conclusion inherit the confidence of a fact.
- **Attribution is context, not conclusion.** Naming an actor explains *how* they
  operate; it rarely changes what you must defend. Prefer TTP-driven action over
  actor-driven action, and mark attribution confidence explicitly.
- **Use estimative language with confidence levels.** High / Moderate / Low, and say
  what would change your mind.
- **Preserve provenance.** Every claim carries its source and date. Intel decays; an
  undated assertion cannot be aged out.
- **Never editorialise the victim.** Most breaches exploit design traps, not stupidity.

## Output Format

Produce a synthesis record:

| Field | Content |
|-------|---------|
| Pattern | The reusable attack pattern (not the one-off incident) |
| ATT&CK | Technique IDs across the chain |
| Surface | Which attack-surface area it lands in |
| Coverage | Covered / partial / gap — against existing controls and skills |
| Action | Detection to build, control to change, or "already covered" |
| Confidence | High / Moderate / Low + what would change it |
| Provenance | Source + date |

## Live Intel Integration

Skills in this library carry an auto-maintained `references/live-threat-intel.md`
section, refreshed weekly by `scripts/intel-sync.js` from the operator's threat-intel
corpus. That block is machine-generated between markers — treat it as current
observations to reason over, and treat the surrounding curated references as the
durable, human-authored tradecraft.
