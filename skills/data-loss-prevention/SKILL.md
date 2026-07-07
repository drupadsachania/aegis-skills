---
name: data-loss-prevention
version: 1.0.0
description: >
  Cross-layer data loss prevention (DLP) programme covering data classification and
  discovery, network egress and DNS exfiltration control, endpoint channels
  (USB/clipboard/print/screenshot), email and SaaS/CASB, cloud and object storage
  (DSPM), and exfiltration detection and response. Unlike email/endpoint-only DLP,
  this treats every layer where data can leave. Triggers for: DLP programme design,
  data classification, exfiltration detection, insider threat data controls, CASB/DSPM
  rollout, egress filtering, or any exercise to stop sensitive data leaving the estate.
frameworks: [mitre-attack, nist-800-53, iso27001]
tags: [security, dlp, data-protection, exfiltration, casb, dspm, insider-threat, egress, classification]
phases:
  - id: data-classification
    ref: references/data-classification.md
    lazy: false
  - id: network-dlp
    ref: references/network-dlp.md
    lazy: true
  - id: endpoint-dlp
    ref: references/endpoint-dlp.md
    lazy: true
  - id: email-and-saas-dlp
    ref: references/email-and-saas-dlp.md
    lazy: true
  - id: cloud-and-storage-dlp
    ref: references/cloud-and-storage-dlp.md
    lazy: true
  - id: exfiltration-detection-and-response
    ref: references/exfiltration-detection-and-response.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, nvd-cve-feed, cisa-advisories]
  red-team: true
self-learning:
  update-frequency: weekly
  sources: [mitre-attack-stix, cisa-advisories]
  health-score: 1.0
  stale-threshold-days: 90
  coverage-gaps: []
context:
  environments: [enterprise, cloud, saas, hybrid, endpoint]
  industry-verticals: [financial-services, healthcare, technology, government, legal]
  attack-surface-tags: [data-exfiltration, insider-threat, egress, saas, cloud-storage, email]
---

# Data Loss Prevention (Cross-Layer) Skill

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
