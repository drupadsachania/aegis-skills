# Alert Triage — Reference

**Entry Criteria:** SIEM alert generated with severity Medium or above; or analyst-escalated ticket from Tier 1 queue.

**Required Inputs:** Alert details (source, rule, timestamp), asset inventory (CMDB), threat intel platform access.

## Enrichment Sources Table

| Enrichment Type | Source | Purpose |
|----------------|--------|---------|
| Asset context | CMDB / ServiceNow | Owner, tier, business function |
| Threat intel | VirusTotal, MISP, ThreatConnect | IOC reputation, known campaign |
| User context | Active Directory / IdP | Account type, recent activity, department |
| Vulnerability context | Tenable / Qualys | Is affected asset unpatched? |
| Previous incidents | SIEM / ticketing | Has this asset or user appeared in prior incidents? |
| Geo / IP reputation | MaxMind, AbuseIPDB | Is source IP from unexpected country or known malicious range? |

## Triage SLAs Table

| Priority | Trigger | Acknowledge | Initial Assessment | Escalation |
|----------|---------|-------------|-------------------|-----------|
| P1 — Critical | Active breach, ransomware, C2 comms | 5 minutes | 15 minutes | Immediate to IC + CISO |
| P2 — High | Confirmed compromise indicator on Tier 1/2 asset | 15 minutes | 30 minutes | Within 30 min to Security Manager |
| P3 — Medium | Suspicious activity requiring investigation | 30 minutes | 2 hours | Escalate if investigation confirms compromise |
| P4 — Low | Policy violation, informational | 4 hours | 8 hours | Self-service; no escalation unless scope expands |

## Triage Decision Tree

```
Alert received
    │
    ├─► Is this a known false-positive rule? (check exclusion list)
    │       YES → Close as FP; log suppression candidate
    │       NO  ↓
    │
    ├─► Enrich: asset tier + IOC reputation + user context
    │       ↓
    ├─► Is the asset a Tier 1/2 crown jewel?
    │       YES → Immediate P1/P2 declaration; notify IC
    │       NO  ↓
    │
    ├─► Does threat intel confirm malicious IOC?
    │       YES → Escalate to incident; create INC ticket
    │       NO  ↓
    │
    └─► Analyst judgment — investigate further or close with documentation
```

**Outputs:** Incident ticket (if escalated); FP report (if false positive); closed alert with justification (if benign).
