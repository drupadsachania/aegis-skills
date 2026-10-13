---
name: security-operations
description: >-
  Full security operations workflow covering the complete SOC operating model
  — from alert triage through threat intelligence, vulnerability management,
  incident detection, incident response, post-incident review, metrics, and
  compliance reporting. Designed for SOC analysts, security engineers, and
  security managers running operational security programmes.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "response"
---

# Security Operations Skill

## Scope and authorization

- Purpose: Run SOC operations from alert triage through incident response, metrics and compliance reporting.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: offensive actions, response actions on systems outside your authority, and disabling logging or covering tracks.


Guide a complete SOC operating cycle from daily alert triage to compliance reporting.
Each phase includes entry criteria, required inputs, and measurable outputs.

## Phase Map

```
Phase 1 → Alert Triage              [read: references/alert-triage.md]
Phase 2 → Threat Intelligence       [read: references/threat-intelligence.md]
Phase 3 → Vulnerability Management  [read: references/vulnerability-management.md]
Phase 4 → Incident Detection        [read: references/incident-detection.md]
Phase 5 → Incident Response         [read: references/incident-response.md]
Phase 6 → Post-Incident Review      [read: references/post-incident-review.md]
Phase 7 → Security Metrics          [read: references/security-metrics.md]
Phase 8 → Compliance Reporting      [read: references/compliance-reporting.md]
Phase 9 → Detection Validation      [read: references/detection-validation.md]
```

## Output Format

Each phase produces structured outputs: alert disposition (Phase 1), intelligence report (Phase 2), patching plan (Phase 3), incident declaration (Phase 4), IR timeline (Phase 5), PIR action items (Phase 6), metrics dashboard (Phase 7), compliance evidence package (Phase 8).

## Phases

Load each phase only when the workflow reaches it:

- [Alert triage](references/alert-triage.md)
- [Threat intelligence](references/threat-intelligence.md)
- [Vulnerability management](references/vulnerability-management.md)
- [Incident detection](references/incident-detection.md)
- [Incident response](references/incident-response.md)
- [Post incident review](references/post-incident-review.md)
- [Security metrics](references/security-metrics.md)
- [Compliance reporting](references/compliance-reporting.md)
- [Detection validation](references/detection-validation.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
