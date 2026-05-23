---
name: security-documentation
version: 1.0.0
description: >
  Security documentation authoring workflow for policies, runbooks, and incident
  response templates. Triggers for: new security policy creation, IR runbook authoring,
  compliance documentation, or any exercise requiring structured security writing that
  meets audit and operational standards.
frameworks: [iso-27001, nist-csf, sans-policies]
tags: [security, documentation, policy, runbook, incident-response, compliance]
phases:
  - id: policy-writing
    ref: references/policy-writing.md
    lazy: false
  - id: runbook-authoring
    ref: references/runbook-authoring.md
    lazy: true
  - id: incident-templates
    ref: references/incident-templates.md
    lazy: true
tools: [read, write]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [sans-policy-templates, nist-csf]
  red-team: false
self-learning:
  update-frequency: monthly
  sources: [sans-policy-templates, nist-csf-updates, iso-27001-updates]
  health-score: 1.0
  stale-threshold-days: 180
  coverage-gaps: []
context:
  environments: [enterprise, cloud, hybrid]
  industry-verticals: [financial-services, healthcare, government, manufacturing, technology]
  attack-surface-tags: [governance, compliance, policy, documentation, audit]
---

# Security Documentation Skill

Author clear, actionable, audit-ready security documentation.

## Phase Map

```
Phase 1 → Policy Writing            [read: references/policy-writing.md]
Phase 2 → Runbook Authoring         [read: references/runbook-authoring.md]
Phase 3 → Incident Templates        [read: references/incident-templates.md]
```

## Output Format

Produce structured Markdown documents following the templates in each phase reference file, suitable for direct use in governance repositories.
