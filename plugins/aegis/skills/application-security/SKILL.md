---
name: application-security
description: >-
  Application security assessment workflow covering threat modelling, static
  analysis, dependency auditing, API security, and security testing. Triggers
  for: pre-release security review, SAST/DAST gap analysis, API security
  hardening, or OWASP Top 10 remediation planning.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Application Security Skill

## Scope and authorization

- Purpose: Find and fix security weaknesses in applications and APIs you build or maintain, before and after release.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: exploiting third-party or production applications without written authorization, and writing weaponised exploits or bypasses for live targets.


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

## Phases

Load each phase only when the workflow reaches it:

- [Threat modeling appsec](references/threat-modeling-appsec.md)
- [Sast review](references/sast-review.md)
- [Dependency audit](references/dependency-audit.md)
- [Api security](references/api-security.md)
- [Security testing](references/security-testing.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
