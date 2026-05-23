---
name: threat-modeling
version: 1.0.0
description: >
  Structured threat modelling workflow using STRIDE and PASTA methodologies. Triggers
  for: new system design review, pre-release threat model, architectural security
  review, or any exercise requiring a systematic attacker-perspective analysis of a
  system's design.
frameworks: [stride, pasta, mitre-attack]
tags: [security, threat-modeling, architecture, stride, risk]
phases:
  - id: scope-definition
    ref: references/scope-definition.md
    lazy: false
  - id: data-flow-diagramming
    ref: references/data-flow-diagramming.md
    lazy: true
  - id: threat-enumeration
    ref: references/threat-enumeration.md
    lazy: true
  - id: mitigation-mapping
    ref: references/mitigation-mapping.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack]
  red-team: true
self-learning:
  update-frequency: monthly
  sources: [mitre-attack-stix, owasp-advisories]
  health-score: 1.0
  stale-threshold-days: 120
  coverage-gaps: []
context:
  environments: [enterprise, cloud, embedded, iot]
  industry-verticals: [financial-services, healthcare, government, manufacturing, saas-providers]
  attack-surface-tags: [architecture, design, data-flows, trust-boundaries, authentication]
---

# Threat Modelling Skill

Produce a structured threat model for any system using STRIDE enumeration against a data flow diagram.

## Phase Map

```
Phase 1 → Scope Definition          [read: references/scope-definition.md]
Phase 2 → Data Flow Diagramming     [read: references/data-flow-diagramming.md]
Phase 3 → Threat Enumeration        [read: references/threat-enumeration.md]
Phase 4 → Mitigation Mapping        [read: references/mitigation-mapping.md]
```

## Output Format

Produce a threat register table (STRIDE category, DFD element, threat statement, DREAD score, mitigation, residual risk).
