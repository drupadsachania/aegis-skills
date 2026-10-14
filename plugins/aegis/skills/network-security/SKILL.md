---
name: network-security
description: >-
  Network security assessment and hardening workflow. Triggers for: network
  segmentation review, traffic analysis, firewall rule audits, network
  inventory, perimeter hardening, lateral movement prevention, or any exercise
  requiring network threat surface reduction.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Network Security Skill

## Scope and authorization

- Purpose: Review segmentation, traffic, firewall rules and hardening to shrink your network attack surface.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: scanning, intercepting or disrupting networks you are not authorised to assess, and denial-of-service testing.


Assess and harden the network attack surface. Use this skill to enumerate network assets,
review segmentation controls, analyse traffic patterns for anomalies, and produce a
prioritised hardening checklist anchored to ATT&CK lateral movement and discovery techniques.

## Phase Map

```
Phase 1 → Network Inventory        [read: references/network-inventory.md]
Phase 2 → Segmentation Review      [read: references/segmentation-review.md]
Phase 3 → Traffic Analysis         [read: references/traffic-analysis.md]
Phase 4 → Hardening Checklist      [read: references/hardening-checklist.md]
```

## Output Format

Produce a prioritised hardening checklist table with ATT&CK technique mitigated, implementation complexity, and owner.

## Phases

Load each phase only when the workflow reaches it:

- [Network inventory](references/network-inventory.md)
- [Segmentation review](references/segmentation-review.md)
- [Traffic analysis](references/traffic-analysis.md)
- [Hardening checklist](references/hardening-checklist.md)
- [Cve patch management](references/cve-patch-management.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
