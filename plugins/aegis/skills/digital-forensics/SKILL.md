---
name: digital-forensics
description: >-
  End-to-end digital forensics and incident response (DFIR) workflow. Covers
  evidence acquisition with chain of custody, disk and memory forensics,
  network forensics, cloud and mobile evidence, and timeline reconstruction.
  Triggers for: incident investigation, evidence collection, memory forensics,
  disk imaging, DFIR engagements, or legal/regulatory evidence requirements.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "response"
---

# Digital Forensics Skill

## Scope and authorization

- Purpose: Acquire, preserve and analyse evidence to investigate incidents with a defensible chain of custody.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: accessing devices, accounts or data without legal authority, and anti-forensics or evidence tampering.

Structured DFIR methodology following forensic soundness principles.
Chain of custody must be established at evidence acquisition and maintained
throughout all analysis phases. Legal admissibility requirements must be
considered from the first contact with evidence.

## Phases

Load each phase only when the workflow reaches it:

- [Evidence acquisition](references/evidence-acquisition.md)
- [Disk forensics](references/disk-forensics.md)
- [Memory forensics](references/memory-forensics.md)
- [Network forensics](references/network-forensics.md)
- [Cloud and mobile](references/cloud-and-mobile.md)
- [Timeline reconstruction](references/timeline-reconstruction.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
