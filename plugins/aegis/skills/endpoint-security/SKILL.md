---
name: endpoint-security
description: >-
  Endpoint security workflow covering EDR deployment, baseline hardening,
  malware analysis, and endpoint incident response. Triggers for: EDR gap
  assessment, workstation hardening review, malware triage, or
  endpoint-related incident investigation.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Endpoint Security Skill

## Scope and authorization

- Purpose: Harden, monitor and respond on endpoints you manage, and validate that EDR controls actually work.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: disabling or evading security tooling on systems you do not administer, and building malware.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


Secure endpoints against malware, credential theft, and execution-based attacks.
Covers EDR coverage assessment, OS hardening, malware triage workflow, and
endpoint-specific incident response procedures.

## Phase Map

```
Phase 1 → EDR Deployment            [read: references/edr-deployment.md]
Phase 2 → Baseline Hardening        [read: references/baseline-hardening.md]
Phase 3 → Malware Analysis          [read: references/malware-analysis.md]
Phase 4 → Incident Response         [read: references/incident-response.md]
Phase 5 → Control Effectiveness Validation  [read: references/control-effectiveness-validation.md]
```

Phase 5 validates that deployed controls actually prevent or detect the techniques they
are meant to — producing the detection dimension consumed by the `exposure-validation`
skill. Deployment status (Phase 1) and tested effectiveness (Phase 5) are different facts.

## Output Format

Produce an EDR coverage heatmap against ATT&CK tactics, a hardening gap table, and an incident timeline.

## Phases

Load each phase only when the workflow reaches it:

- [Edr deployment](references/edr-deployment.md)
- [Baseline hardening](references/baseline-hardening.md)
- [Malware analysis](references/malware-analysis.md)
- [Incident response](references/incident-response.md)
- [Control effectiveness validation](references/control-effectiveness-validation.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
