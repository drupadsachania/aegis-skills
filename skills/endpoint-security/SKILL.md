---
name: endpoint-security
version: 1.0.0
description: >
  Endpoint security workflow covering EDR deployment, baseline hardening, malware analysis,
  and endpoint incident response. Triggers for: EDR gap assessment, workstation hardening
  review, malware triage, or endpoint-related incident investigation.
frameworks: [mitre-attack, cis-benchmarks]
tags: [security, endpoint, edr, hardening, malware, incident-response]
phases:
  - id: edr-deployment
    ref: references/edr-deployment.md
    lazy: true
  - id: baseline-hardening
    ref: references/baseline-hardening.md
    lazy: false
  - id: malware-analysis
    ref: references/malware-analysis.md
    lazy: true
  - id: incident-response
    ref: references/incident-response.md
    lazy: true
  - id: control-effectiveness-validation
    ref: references/control-effectiveness-validation.md
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
  feeds: [mitre-attack, nvd-cve-feed]
  red-team: true
self-learning:
  update-frequency: weekly
  sources: [mitre-attack-stix, nvd-cve-feed, cisa-kev]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, remote-workforce, cloud-workstations]
  industry-verticals: [financial-services, healthcare, government, professional-services]
  attack-surface-tags: [endpoint, workstation, malware, credential-theft, execution]
---

# Endpoint Security Skill

Secure endpoints against malware, credential theft, and execution-based attacks.
Covers EDR coverage assessment, OS hardening, malware triage workflow, and
endpoint-specific incident response procedures.

## Phase Map

```
Phase 1 → EDR Deployment            [read: references/edr-deployment.md]
Phase 2 → Baseline Hardening        [read: references/baseline-hardening.md]
Phase 3 → Malware Analysis          [read: references/malware-analysis.md]
Phase 4 → Incident Response         [read: references/incident-response.md]
Phase 5 → Control Effectiveness Validation  [read: references/control-effectiveness-validation.md]
```

Phase 5 validates that deployed controls actually prevent or detect the techniques they
are meant to — producing the detection dimension consumed by the `exposure-validation`
skill. Deployment status (Phase 1) and tested effectiveness (Phase 5) are different facts.

## Output Format

Produce an EDR coverage heatmap against ATT&CK tactics, a hardening gap table, and an incident timeline.
