---
name: infrastructure-security
description: >-
  Infrastructure security assessment workflow covering asset discovery,
  configuration baseline, patch management, hardening controls, and compliance
  validation. Use for CIS Benchmark assessments, cloud security posture
  reviews, or infrastructure hardening sprints.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Infrastructure Security Skill

## Scope and authorization

- Purpose: Assess and harden configuration, patching and benchmark compliance for infrastructure you operate.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: scanning or changing infrastructure outside your authorised scope, and exploiting the weaknesses you find.


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

## Phases

Load each phase only when the workflow reaches it:

- [Asset discovery](references/asset-discovery.md)
- [Configuration baseline](references/configuration-baseline.md)
- [Patch management](references/patch-management.md)
- [Hardening controls](references/hardening-controls.md)
- [Compliance validation](references/compliance-validation.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
