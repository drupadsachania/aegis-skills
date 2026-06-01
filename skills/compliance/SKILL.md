---
name: compliance
version: 1.0.0
description: >
  End-to-end security compliance workflow covering scope definition, regulatory
  mapping, control assessment, evidence collection, and remediation roadmap.
  Supports SOC 2, ISO 27001:2022, PCI-DSS v4.0, HIPAA, GDPR, NIST CSF 2.0,
  and CIS Controls v8. Triggers for: compliance audit preparation, control gap
  assessment, evidence collection, regulatory mapping, or remediation planning.
frameworks: [nist-csf, cis-controls, iso-27001, pci-dss]
tags: [security, compliance, audit, soc2, iso27001, pci-dss, hipaa, gdpr, nist-csf]
phases:
  - id: scope-definition
    ref: references/scope-definition.md
    lazy: true
  - id: standard-mapping
    ref: references/standard-mapping.md
    lazy: true
  - id: control-assessment
    ref: references/control-assessment.md
    lazy: true
  - id: evidence-collection
    ref: references/evidence-collection.md
    lazy: true
  - id: remediation-roadmap
    ref: references/remediation-roadmap.md
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
  sources: [aicpa-tsc, iso-27001-2022, pci-ssc, nist-csf-2]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, cloud, saas, hybrid]
  industry-verticals: [financial-services, healthcare, e-commerce, saas-providers, government]
  attack-surface-tags: [compliance, audit, data-protection, access-control, encryption]
---

# Compliance Skill

Multi-standard compliance workflow. Begin with scope definition to determine
which regulations apply, then map controls, assess effectiveness, collect
evidence, and build a prioritised remediation roadmap.
