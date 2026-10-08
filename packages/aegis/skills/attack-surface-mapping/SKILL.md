---
name: attack-surface-mapping
description: >-
  Attack surface mapping and exposure analysis workflow. Triggers for:
  external attack surface assessment, internet-facing asset discovery, cloud
  misconfiguration audit, or any exercise requiring a comprehensive map of an
  organisation's exploitable exposure.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "intel"
---

# Attack Surface Mapping Skill

## Scope and authorization

- Purpose: Inventory and prioritise your organisation's own internet-facing, internal and cloud exposure so it can be reduced.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: scanning or enumerating assets you do not own or have written permission to assess, and any credential attack or exploitation.


Enumerate and prioritise an organisation's exploitable attack surface.

## Phase Map

```
Phase 1 → External Discovery        [read: references/external-discovery.md]
Phase 2 → Internal Enumeration      [read: references/internal-enumeration.md]
Phase 3 → Cloud Exposure            [read: references/cloud-exposure.md]
Phase 4 → Risk Prioritization       [read: references/risk-prioritization.md]
```

## Output Format

Produce an attack surface register (asset, exposure type, risk score, ATT&CK technique, remediation priority, SLA).

## Phases

Load each phase only when the workflow reaches it:

- [External discovery](references/external-discovery.md)
- [Internal enumeration](references/internal-enumeration.md)
- [Cloud exposure](references/cloud-exposure.md)
- [Risk prioritization](references/risk-prioritization.md)
- [Cve exposure management](references/cve-exposure-management.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
