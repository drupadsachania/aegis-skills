---
name: identity-access-management
version: 1.0.0
description: >
  Comprehensive IAM programme covering identity governance (Joiners/Movers/Leavers),
  human authentication (FIDO2, SSO, passwordless), privileged access management (PAM),
  non-human identities (service accounts, API keys, secrets), AI/agent identity,
  and access review and audit. Triggers for: MFA deployment, PAM design, secrets
  management, identity governance, agent identity, or access review programme.
frameworks: [nist-csf, owasp-asvs, cis-controls]
tags: [security, iam, identity, mfa, pam, sso, rbac, abac, fido2, secrets-management, agent-identity]
phases:
  - id: identity-governance
    ref: references/identity-governance.md
    lazy: true
  - id: human-authentication
    ref: references/human-authentication.md
    lazy: true
  - id: privileged-access-management
    ref: references/privileged-access-management.md
    lazy: true
  - id: non-human-identities
    ref: references/non-human-identities.md
    lazy: true
  - id: agent-and-ai-identities
    ref: references/agent-and-ai-identities.md
    lazy: true
  - id: access-review-and-audit
    ref: references/access-review-and-audit.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, nvd-cve-feed]
  red-team: false
self-learning:
  update-frequency: weekly
  sources: [nist-sp-800-63b, cis-iam-controls, owasp-asvs]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, cloud, saas, hybrid]
  industry-verticals: [financial-services, healthcare, government, technology, critical-infrastructure]
  attack-surface-tags: [authentication, authorisation, credential-theft, privilege-escalation, lateral-movement]
---

# Identity and Access Management Skill

Comprehensive IAM framework covering human identities, privileged access,
non-human identities, and the emerging challenge of AI/agent identity.
Prioritise phishing-resistant authentication and least-privilege access.
