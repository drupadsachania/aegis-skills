---
name: attack-surface-mapping
version: 1.0.0
description: >
  Attack surface mapping and exposure analysis workflow. Triggers for: external attack
  surface assessment, internet-facing asset discovery, cloud misconfiguration audit,
  or any exercise requiring a comprehensive map of an organisation's exploitable exposure.
frameworks: [mitre-attack, owasp-asvs]
tags: [security, attack-surface, reconnaissance, exposure, cloud-security, external-assets]
phases:
  - id: external-discovery
    ref: references/external-discovery.md
    lazy: false
  - id: internal-enumeration
    ref: references/internal-enumeration.md
    lazy: true
  - id: cloud-exposure
    ref: references/cloud-exposure.md
    lazy: true
  - id: risk-prioritization
    ref: references/risk-prioritization.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [shodan-feed, censys-feed, cisa-advisories]
  red-team: true
self-learning:
  update-frequency: weekly
  sources: [nvd-cve-feed, shodan-monitored, cisa-advisories]
  health-score: 1.0
  stale-threshold-days: 30
  coverage-gaps: []
context:
  environments: [enterprise, cloud, hybrid, saas]
  industry-verticals: [financial-services, healthcare, government, retail, technology]
  attack-surface-tags: [external-exposure, reconnaissance, cloud-misconfiguration, internet-facing, shadow-it]
---

# Attack Surface Mapping Skill

Enumerate and prioritise an organisation's exploitable attack surface.

## Phase Map

```
Phase 1 → External Discovery        [read: references/external-discovery.md]
Phase 2 → Internal Enumeration      [read: references/internal-enumeration.md]
Phase 3 → Cloud Exposure            [read: references/cloud-exposure.md]
Phase 4 → Risk Prioritization       [read: references/risk-prioritization.md]
```

## Output Format

Produce an attack surface register (asset, exposure type, risk score, ATT&CK technique, remediation priority, SLA).
