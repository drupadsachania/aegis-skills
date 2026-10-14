---
name: risk-management
description: >-
  End-to-end information security risk management programme covering risk
  identification, qualitative and quantitative assessment (FAIR model),
  treatment selection, risk register governance, and executive risk reporting.
  Triggers for: risk assessment, risk register design, risk appetite
  definition, threat modelling integration, FAIR quantification, or risk
  reporting.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "governance"
---

# Risk Management Skill

## Scope and authorization

- Purpose: Identify, assess, treat and report information-security risk, including FAIR quantification.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: financial, legal or insurance advice; risk acceptance decisions stay with accountable owners.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


Threat-informed risk management methodology. Begin with risk identification
using asset inventory and threat intelligence, then assess likelihood and
impact quantitatively, select treatment options, maintain a governed risk
register, and report risk posture to leadership.

The exposure-risk-model phase adds deterministic, evidence-backed scoring for the
`exposure-validation` lifecycle: risk assigned by explicit logic (reasoning explains it,
never overrides it), a business-context chain to crown jewels, and risk reduction
expressed as a proven before/after delta rather than an assertion.

## Phases

Load each phase only when the workflow reaches it:

- [Risk identification](references/risk-identification.md)
- [Risk assessment](references/risk-assessment.md)
- [Risk treatment](references/risk-treatment.md)
- [Risk register](references/risk-register.md)
- [Risk reporting](references/risk-reporting.md)
- [Exposure risk model](references/exposure-risk-model.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
