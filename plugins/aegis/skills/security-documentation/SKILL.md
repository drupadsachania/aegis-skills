---
name: security-documentation
description: >-
  Security documentation authoring workflow for policies, runbooks, and
  incident response templates. Triggers for: new security policy creation, IR
  runbook authoring, compliance documentation, or any exercise requiring
  structured security writing that meets audit and operational standards.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "governance"
---

# Security Documentation Skill

## Scope and authorization

- Purpose: Write security policies, runbooks and incident templates that meet audit and operational standards.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: legal sign-off, and documents that describe controls which do not exist.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


Author clear, actionable, audit-ready security documentation.

## Phase Map

```
Phase 1 → Policy Writing            [read: references/policy-writing.md]
Phase 2 → Runbook Authoring         [read: references/runbook-authoring.md]
Phase 3 → Incident Templates        [read: references/incident-templates.md]
```

## Output Format

Produce structured Markdown documents following the templates in each phase reference file, suitable for direct use in governance repositories.

## Phases

Load each phase only when the workflow reaches it:

- [Policy writing](references/policy-writing.md)
- [Runbook authoring](references/runbook-authoring.md)
- [Incident templates](references/incident-templates.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
