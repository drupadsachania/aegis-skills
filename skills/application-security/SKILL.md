---
name: application-security
version: 1.0.0
description: >
  Application security assessment workflow covering threat modelling, static analysis,
  dependency auditing, API security, and security testing. Triggers for: pre-release
  security review, SAST/DAST gap analysis, API security hardening, or OWASP Top 10
  remediation planning.
frameworks: [owasp-top10, mitre-attack, nist-ssdf]
tags: [security, appsec, sast, api, owasp, supply-chain, testing]
phases:
  - id: threat-modeling-appsec
    ref: references/threat-modeling-appsec.md
    lazy: true
  - id: sast-review
    ref: references/sast-review.md
    lazy: true
  - id: dependency-audit
    ref: references/dependency-audit.md
    lazy: true
  - id: api-security
    ref: references/api-security.md
    lazy: false
  - id: security-testing
    ref: references/security-testing.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [nvd-cve-feed, osv-database, owasp-advisories]
  red-team: true
self-learning:
  update-frequency: weekly
  sources: [nvd-cve-feed, osv-database, github-advisories]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, cloud, saas, mobile]
  industry-verticals: [financial-services, healthcare, e-commerce, saas-providers]
  attack-surface-tags: [web-application, api, supply-chain, authentication, injection]
---

# Application Security Skill

Systematically assess web applications and APIs for security weaknesses across the full SDLC.

## Phase Map

```
Phase 1 → Threat Modelling (AppSec)  [read: references/threat-modeling-appsec.md]
Phase 2 → SAST Review                [read: references/sast-review.md]
Phase 3 → Dependency Audit           [read: references/dependency-audit.md]
Phase 4 → API Security               [read: references/api-security.md]
Phase 5 → Security Testing           [read: references/security-testing.md]
```

## Output Format

Produce a findings table (OWASP category, severity, CVSS score, remediation effort) and a security testing coverage matrix.
