---
name: data-loss-prevention
description: >-
  Cross-layer data loss prevention (DLP) programme covering data
  classification and discovery, network egress and DNS exfiltration control,
  endpoint channels (USB/clipboard/print/screenshot), email and SaaS/CASB,
  cloud and object storage (DSPM), and exfiltration detection and response.
  Unlike email/endpoint-only DLP, this treats every layer where data can
  leave. Triggers for: DLP programme design, data classification, exfiltration
  detection, insider threat data controls, CASB/DSPM rollout, egress
  filtering, or any exercise to stop sensitive data leaving the estate.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Data Loss Prevention (Cross-Layer) Skill

## Scope and authorization

- Purpose: Design controls that detect and stop sensitive data leaving your estate across every layer.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: covert monitoring of individuals beyond lawful, disclosed policy, and techniques for exfiltrating data or evading DLP.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


Stop sensitive data leaving the organisation across **every** channel — not just email
and endpoints. DLP fails when it is bolted onto one layer while data walks out of another.
This skill drives a defence-in-depth programme: classify data once, then enforce and
monitor consistently at the network, endpoint, email/SaaS, and cloud/storage layers,
with unified exfiltration detection and response.

## Core Principle

You cannot protect what you have not classified, and you cannot stop what you cannot see.
Classification (Phase 1) is the foundation; every enforcement layer references the same
labels. A control on one layer is only as good as the weakest unmonitored egress path.

## Phase Map

```
Phase 1 → Data Classification & Discovery   [read: references/data-classification.md]
Phase 2 → Network DLP (egress / DNS / TLS)  [read: references/network-dlp.md]
Phase 3 → Endpoint DLP (USB/clipboard/print)[read: references/endpoint-dlp.md]
Phase 4 → Email & SaaS / CASB               [read: references/email-and-saas-dlp.md]
Phase 5 → Cloud & Object Storage / DSPM     [read: references/cloud-and-storage-dlp.md]
Phase 6 → Exfiltration Detection & Response [read: references/exfiltration-detection-and-response.md]
```

## Exfiltration Kill Chain (ATT&CK Collection → Exfiltration)

| Stage | ATT&CK | Layer that catches it |
|-------|--------|-----------------------|
| Data staged locally | T1074 Data Staged | Endpoint DLP |
| Compressed / encrypted for exfil | T1560 Archive Collected Data | Endpoint + Network |
| Exfil over C2 channel | T1041 Exfiltration Over C2 | Network DLP |
| Exfil over web service | T1567 Exfiltration to Cloud/Web | Network + CASB |
| Exfil over alternative protocol (DNS) | T1048 / T1071.004 | Network DLP (DNS) |
| Exfil to physical medium (USB) | T1052 Exfiltration Over Physical Medium | Endpoint DLP |
| Transfer to attacker cloud account | T1537 Transfer Data to Cloud Account | Cloud/Storage DLP |

## Output Format

Produce a layered DLP control map: for each data class, list the enforcement control and
detection at every layer (network, endpoint, email/SaaS, cloud), the ATT&CK exfiltration
technique it addresses, the policy mode (monitor / block), and the owner.

## Phases

Load each phase only when the workflow reaches it:

- [Data classification](references/data-classification.md)
- [Network dlp](references/network-dlp.md)
- [Endpoint dlp](references/endpoint-dlp.md)
- [Email and saas dlp](references/email-and-saas-dlp.md)
- [Cloud and storage dlp](references/cloud-and-storage-dlp.md)
- [Exfiltration detection and response](references/exfiltration-detection-and-response.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
