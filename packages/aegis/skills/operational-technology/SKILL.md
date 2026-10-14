---
name: operational-technology
description: >-
  OT/ICS security programme covering asset discovery, risk assessment, network
  security (ISA/IEC 62443 zone and conduit model), incident detection and
  response, and compliance with NERC CIP and ISA/IEC 62443. Triggers for: OT
  asset inventory, ICS security assessment, OT network segmentation, NERC CIP
  compliance, ICS incident response, or Purdue model zone design.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Operational Technology Security Skill

## Scope and authorization

- Purpose: Secure OT and ICS environments through asset discovery, risk assessment, segmentation and response planning.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: active scanning of, or changes to, live control systems without operator and safety approval, and any action that could affect physical safety or process availability.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


OT/ICS security is fundamentally different from IT security. Safety takes
priority over confidentiality. Availability is the highest priority (C-I-A
becomes A-I-C in OT). Never perform active scanning on live OT networks
without explicit change control approval and maintenance window scheduling.

## Phases

Load each phase only when the workflow reaches it:

- [Ot asset discovery](references/ot-asset-discovery.md)
- [Risk and vulnerability assessment](references/risk-and-vulnerability-assessment.md)
- [Network security](references/network-security.md)
- [Incident detection and response](references/incident-detection-and-response.md)
- [Resilience and compliance](references/resilience-and-compliance.md)
- [Ics protocol security](references/ics-protocol-security.md)
- [Safety instrumented systems](references/safety-instrumented-systems.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
