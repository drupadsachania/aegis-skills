---
name: security-operations
version: 1.0.0
description: >
  Full security operations workflow covering the complete SOC operating model — from
  alert triage through threat intelligence, vulnerability management, incident detection,
  incident response, post-incident review, metrics, and compliance reporting. Designed
  for SOC analysts, security engineers, and security managers running operational
  security programmes.
frameworks: [mitre-attack, nist-csf, sans-incident-response, iso-27035]
tags: [security, soc, operations, incident-response, threat-intelligence, vulnerability-management, metrics, compliance]
phases:
  - id: alert-triage
    ref: references/alert-triage.md
    lazy: false
  - id: threat-intelligence
    ref: references/threat-intelligence.md
    lazy: true
  - id: vulnerability-management
    ref: references/vulnerability-management.md
    lazy: true
  - id: incident-detection
    ref: references/incident-detection.md
    lazy: true
  - id: incident-response
    ref: references/incident-response.md
    lazy: true
  - id: post-incident-review
    ref: references/post-incident-review.md
    lazy: true
  - id: security-metrics
    ref: references/security-metrics.md
    lazy: true
  - id: compliance-reporting
    ref: references/compliance-reporting.md
    lazy: true
tools: [read, search, analyze, write]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, nvd-cve-feed, cisa-advisories, isac-feeds]
  red-team: true
self-learning:
  update-frequency: daily
  sources: [mitre-attack-stix, nvd-cve-feed, cisa-kev, cisa-advisories, isac-feeds]
  health-score: 1.0
  stale-threshold-days: 30
  coverage-gaps: []
context:
  environments: [enterprise, cloud, hybrid, ot, remote-workforce]
  industry-verticals: [financial-services, healthcare, government, critical-infrastructure, technology, manufacturing]
  attack-surface-tags: [soc, detection, incident-response, threat-intelligence, vulnerability-management, compliance]
---

# Security Operations Skill

Guide a complete SOC operating cycle from daily alert triage to compliance reporting.
Each phase includes entry criteria, required inputs, and measurable outputs.

## Phase Map

```
Phase 1 → Alert Triage              [read: references/alert-triage.md]
Phase 2 → Threat Intelligence       [read: references/threat-intelligence.md]
Phase 3 → Vulnerability Management  [read: references/vulnerability-management.md]
Phase 4 → Incident Detection        [read: references/incident-detection.md]
Phase 5 → Incident Response         [read: references/incident-response.md]
Phase 6 → Post-Incident Review      [read: references/post-incident-review.md]
Phase 7 → Security Metrics          [read: references/security-metrics.md]
Phase 8 → Compliance Reporting      [read: references/compliance-reporting.md]
```

## Output Format

Each phase produces structured outputs: alert disposition (Phase 1), intelligence report (Phase 2), patching plan (Phase 3), incident declaration (Phase 4), IR timeline (Phase 5), PIR action items (Phase 6), metrics dashboard (Phase 7), compliance evidence package (Phase 8).
