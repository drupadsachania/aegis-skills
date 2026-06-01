---
name: risk-management
version: 1.0.0
description: >
  End-to-end information security risk management programme covering risk
  identification, qualitative and quantitative assessment (FAIR model),
  treatment selection, risk register governance, and executive risk reporting.
  Triggers for: risk assessment, risk register design, risk appetite definition,
  threat modelling integration, FAIR quantification, or risk reporting.
frameworks: [nist-csf, iso-31000, fair-model]
tags: [security, risk, grc, risk-register, risk-appetite, threat-modelling, fair]
phases:
  - id: risk-identification
    ref: references/risk-identification.md
    lazy: true
  - id: risk-assessment
    ref: references/risk-assessment.md
    lazy: true
  - id: risk-treatment
    ref: references/risk-treatment.md
    lazy: true
  - id: risk-register
    ref: references/risk-register.md
    lazy: true
  - id: risk-reporting
    ref: references/risk-reporting.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [nist-csf, nvd-cve-feed]
  red-team: false
self-learning:
  update-frequency: weekly
  sources: [nist-sp-800-30, iso-31000, fair-model]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, cloud, hybrid, ot]
  industry-verticals: [financial-services, healthcare, government, critical-infrastructure, energy]
  attack-surface-tags: [risk, compliance, third-party, supply-chain, data-protection]
---

# Risk Management Skill

Threat-informed risk management methodology. Begin with risk identification
using asset inventory and threat intelligence, then assess likelihood and
impact quantitatively, select treatment options, maintain a governed risk
register, and report risk posture to leadership.
