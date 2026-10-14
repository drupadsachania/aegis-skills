---
name: reverse-engineering
description: >-
  End-to-end binary reverse engineering workflow for security analysts. Covers
  safe sample handling, static and dynamic analysis, code analysis,
  anti-analysis technique detection, MITRE ATT&CK TTP mapping, IOC extraction,
  and analyst reporting. Triggers for: malware triage, binary analysis,
  firmware analysis, packed executable analysis, or any reverse engineering
  task.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "response"
---

# Reverse Engineering Skill

## Scope and authorization

- Purpose: Analyse binaries and firmware to understand their behaviour, extract IOCs and support detection.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: cracking licences or DRM, building exploits, and modifying malware for reuse.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


A structured methodology for binary reverse engineering. Follow phases in order:
triage first to establish safety, then static analysis, dynamic analysis, deep
code analysis, and finally produce a report with actionable IOCs and detections.

## Phases

Load each phase only when the workflow reaches it:

- [Triage and safe handling](references/triage-and-safe-handling.md)
- [Static analysis](references/static-analysis.md)
- [Dynamic analysis](references/dynamic-analysis.md)
- [Code analysis](references/code-analysis.md)
- [Reporting](references/reporting.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
