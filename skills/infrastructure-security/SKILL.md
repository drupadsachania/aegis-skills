---
name: infrastructure-security
version: 1.0.0
description: >
  Infrastructure security assessment workflow covering asset discovery, configuration
  baseline, patch management, hardening controls, and compliance validation. Use for
  CIS Benchmark assessments, cloud security posture reviews, or infrastructure hardening sprints.
frameworks: [cis-benchmarks, nist-csf, mitre-attack]
tags: [security, infrastructure, hardening, patch-management, compliance, cloud]
phases:
  - id: asset-discovery
    ref: references/asset-discovery.md
    lazy: true
  - id: configuration-baseline
    ref: references/configuration-baseline.md
    lazy: true
  - id: patch-management
    ref: references/patch-management.md
    lazy: true
  - id: hardening-controls
    ref: references/hardening-controls.md
    lazy: false
  - id: compliance-validation
    ref: references/compliance-validation.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [nvd-cve-feed, cisa-kev, cis-benchmarks]
  red-team: false
self-learning:
  update-frequency: weekly
  sources: [nvd-cve-feed, cisa-kev, cis-benchmarks-updates]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, cloud, hybrid, on-premises]
  industry-verticals: [financial-services, healthcare, government, retail, manufacturing]
  attack-surface-tags: [servers, cloud-workloads, containers, configuration, patch-management]
---

# Infrastructure Security Skill

Systematically assess and harden infrastructure — servers, cloud workloads, containers,
and network devices — against known vulnerabilities and configuration weaknesses.

## Phase Map

```
Phase 1 → Asset Discovery           [read: references/asset-discovery.md]
Phase 2 → Configuration Baseline    [read: references/configuration-baseline.md]
Phase 3 → Patch Management          [read: references/patch-management.md]
Phase 4 → Hardening Controls        [read: references/hardening-controls.md]
Phase 5 → Compliance Validation     [read: references/compliance-validation.md]
```

## Output Format

Produce a gap analysis table with control status (Pass/Fail/Partial), CIS Benchmark reference, and remediation priority.
