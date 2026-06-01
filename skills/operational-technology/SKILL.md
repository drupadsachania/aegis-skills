---
name: operational-technology
version: 1.0.0
description: >
  OT/ICS security programme covering asset discovery, risk assessment,
  network security (ISA/IEC 62443 zone and conduit model), incident detection
  and response, and compliance with NERC CIP and ISA/IEC 62443. Triggers for:
  OT asset inventory, ICS security assessment, OT network segmentation, NERC CIP
  compliance, ICS incident response, or Purdue model zone design.
frameworks: [isa-iec-62443, mitre-attack, nerc-cip]
tags: [security, ot-security, ics, scada, plc, hmi, industrial, purdue-model, isa62443, nerc-cip]
phases:
  - id: ot-asset-discovery
    ref: references/ot-asset-discovery.md
    lazy: true
  - id: risk-and-vulnerability-assessment
    ref: references/risk-and-vulnerability-assessment.md
    lazy: true
  - id: network-security
    ref: references/network-security.md
    lazy: true
  - id: incident-detection-and-response
    ref: references/incident-detection-and-response.md
    lazy: true
  - id: resilience-and-compliance
    ref: references/resilience-and-compliance.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, ics-cert-advisories]
  red-team: false
self-learning:
  update-frequency: weekly
  sources: [ics-cert, isa-iec-62443, cisa-ot-advisories]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [ot, enterprise, hybrid]
  industry-verticals: [energy, utilities, manufacturing, oil-and-gas, water-treatment, critical-infrastructure]
  attack-surface-tags: [ot-network, plc, hmi, scada, historian, remote-access, it-ot-convergence]
---

# Operational Technology Security Skill

OT/ICS security is fundamentally different from IT security. Safety takes
priority over confidentiality. Availability is the highest priority (C-I-A
becomes A-I-C in OT). Never perform active scanning on live OT networks
without explicit change control approval and maintenance window scheduling.
