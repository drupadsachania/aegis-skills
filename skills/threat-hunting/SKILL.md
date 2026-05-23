---
name: threat-hunting
version: 1.0.0
description: >
  Proactive threat hunting workflow. Triggers for: structured hunt campaigns, TTP-based
  hypothesis generation, SIEM query development, anomaly investigation, or any exercise
  requiring proactive adversary search in telemetry rather than reactive alert response.
frameworks: [mitre-attack, sqrll-hunting-maturity]
tags: [security, threat-hunting, detection, siem, hypothesis, telemetry]
phases:
  - id: hypothesis-generation
    ref: references/hypothesis-generation.md
    lazy: false
  - id: data-collection
    ref: references/data-collection.md
    lazy: true
  - id: detection-logic
    ref: references/detection-logic.md
    lazy: true
  - id: investigation
    ref: references/investigation.md
    lazy: true
  - id: reporting
    ref: references/reporting.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, threat-intel-feeds]
  red-team: true
self-learning:
  update-frequency: weekly
  sources: [mitre-attack-stix, cisa-advisories, isac-feeds]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, cloud, hybrid, ot]
  industry-verticals: [financial-services, healthcare, government, critical-infrastructure]
  attack-surface-tags: [detection, lateral-movement, persistence, exfiltration, command-and-control]
---

# Threat Hunting Skill

Proactively search for adversary activity that evades automated detection.

## Phase Map

```
Phase 1 → Hypothesis Generation     [read: references/hypothesis-generation.md]
Phase 2 → Data Collection           [read: references/data-collection.md]
Phase 3 → Detection Logic           [read: references/detection-logic.md]
Phase 4 → Investigation             [read: references/investigation.md]
Phase 5 → Reporting                 [read: references/reporting.md]
```

## Output Format

Produce a hunt report with: hypothesis, telemetry sources queried, queries used, findings (benign/true-positive), and detection engineering recommendations.
