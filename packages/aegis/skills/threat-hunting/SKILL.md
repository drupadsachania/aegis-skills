---
name: threat-hunting
description: >-
  Proactive threat hunting workflow. Triggers for: structured hunt campaigns,
  TTP-based hypothesis generation, SIEM query development, anomaly
  investigation, or any exercise requiring proactive adversary search in
  telemetry rather than reactive alert response.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "intel"
---

# Threat Hunting Skill

## Scope and authorization

- Purpose: Hunt proactively for adversaries in your own telemetry with hypothesis-driven queries.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: collecting telemetry from systems you are not authorised to monitor, and hunting inside third-party environments.


Proactively search for adversary activity that evades automated detection.

## Phase Map

```
Phase 1 → Hypothesis Generation     [read: references/hypothesis-generation.md]
Phase 2 → Data Collection           [read: references/data-collection.md]
Phase 3 → Detection Logic           [read: references/detection-logic.md]
Phase 4 → Investigation             [read: references/investigation.md]
Phase 5 → Reporting                 [read: references/reporting.md]
```

## Output Format

Produce a hunt report with: hypothesis, telemetry sources queried, queries used, findings (benign/true-positive), and detection engineering recommendations.

## Phases

Load each phase only when the workflow reaches it:

- [Hypothesis generation](references/hypothesis-generation.md)
- [Data collection](references/data-collection.md)
- [Detection logic](references/detection-logic.md)
- [Investigation](references/investigation.md)
- [Reporting](references/reporting.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
