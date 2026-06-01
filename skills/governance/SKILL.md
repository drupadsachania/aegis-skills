---
name: governance
version: 1.0.0
description: >
  Security governance programme design and management. Covers policy framework
  development, programme maturity assessment (NIST CSF 2.0 tiers, CMMC),
  security metrics and board reporting, and third-party governance (TPRM).
  Triggers for: security policy development, maturity assessment, board reporting,
  KPI/KRI design, vendor risk programme, or security steering committee setup.
frameworks: [nist-csf, iso-27001, cis-controls]
tags: [security, governance, policy, risk, compliance, metrics, board-reporting, tprm]
phases:
  - id: policy-framework
    ref: references/policy-framework.md
    lazy: true
  - id: program-maturity
    ref: references/program-maturity.md
    lazy: true
  - id: metrics-and-reporting
    ref: references/metrics-and-reporting.md
    lazy: true
  - id: third-party-governance
    ref: references/third-party-governance.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [nist-csf, cis-controls]
  red-team: false
self-learning:
  update-frequency: weekly
  sources: [nist-csf-2, iso-27001, cis-controls]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, hybrid, cloud]
  industry-verticals: [financial-services, healthcare, government, critical-infrastructure]
  attack-surface-tags: [governance, policy, third-party, supply-chain, compliance]
---

# Governance Skill

Security governance programme design covering the full lifecycle from policy
framework through board reporting and third-party risk. Start with policy
framework to establish the hierarchy, then assess maturity, design metrics,
and build TPRM capability.
