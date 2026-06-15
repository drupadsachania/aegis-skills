---
name: network-security
version: 1.0.0
description: >
  Network security assessment and hardening workflow. Triggers for: network segmentation
  review, traffic analysis, firewall rule audits, network inventory, perimeter hardening,
  lateral movement prevention, or any exercise requiring network threat surface reduction.
frameworks: [mitre-attack, nist-csf]
tags: [security, network, segmentation, hardening, perimeter]
phases:
  - id: network-inventory
    ref: references/network-inventory.md
    lazy: true
  - id: segmentation-review
    ref: references/segmentation-review.md
    lazy: true
  - id: traffic-analysis
    ref: references/traffic-analysis.md
    lazy: true
  - id: hardening-checklist
    ref: references/hardening-checklist.md
    lazy: false
  - id: cve-patch-management
    ref: references/cve-patch-management.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, nvd-cve-feed]
  red-team: true
self-learning:
  update-frequency: weekly
  sources: [mitre-attack-stix, nvd-cve-feed, cisa-advisories]
  health-score: 1.0
  stale-threshold-days: 90
  coverage-gaps: []
context:
  environments: [enterprise, cloud, ot, hybrid]
  industry-verticals: [financial-services, healthcare, critical-infrastructure, manufacturing]
  attack-surface-tags: [network, perimeter, lateral-movement, east-west-traffic]
---

# Network Security Skill

Assess and harden the network attack surface. Use this skill to enumerate network assets,
review segmentation controls, analyse traffic patterns for anomalies, and produce a
prioritised hardening checklist anchored to ATT&CK lateral movement and discovery techniques.

## Phase Map

```
Phase 1 → Network Inventory        [read: references/network-inventory.md]
Phase 2 → Segmentation Review      [read: references/segmentation-review.md]
Phase 3 → Traffic Analysis         [read: references/traffic-analysis.md]
Phase 4 → Hardening Checklist      [read: references/hardening-checklist.md]
```

## Output Format

Produce a prioritised hardening checklist table with ATT&CK technique mitigated, implementation complexity, and owner.
