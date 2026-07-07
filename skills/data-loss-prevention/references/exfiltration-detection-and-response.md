# Exfiltration Detection & Response — Reference

Use during Phase 6 to unify the signals from every layer into detection analytics and a
response playbook. DLP that only blocks at each layer independently misses the slow,
multi-channel exfil that spans network, endpoint, and cloud. Correlate, then respond.

## 1. Unified Detection Model

```
Feed every layer's telemetry into one correlation plane (SIEM/XDR):
  Network DLP  → proxy/SWG logs, DNS logs, netflow, CASB alerts
  Endpoint DLP → agent events (USB, clipboard, print, archive, mass-access)
  Email/SaaS   → mail DLP hits, external-share events, forwarding-rule creation
  Cloud/DSPM   → CloudTrail data events, bucket-policy changes, bulk GetObject

Correlate on the actor (user/host/principal) across layers — not per-alert silos.
```

## 2. High-Value Detection Analytics

| Detection | Signal | ATT&CK | Priority |
|-----------|--------|--------|----------|
| Mass internal read → external transfer | Large repo/share access then outbound spike | T1213 → T1567 | Critical |
| Archive-then-exfil | Zip/rar creation followed by upload/USB | T1560 → T1041/T1052 | High |
| Low-and-slow exfil | Small consistent outbound over days to one dest | T1030 | High |
| DNS tunnelling | High-entropy/high-volume DNS to one domain | T1071.004 | High |
| Departing-employee bulk activity | Off-hours downloads during notice period | T1074 | High |
| Cloud bulk download / public share | GetObject spike or bucket made public | T1530/T1537 | Critical |
| Personal-cloud / AI-tool upload of Restricted | CASB/SWG upload of labelled data | T1567.002 | High |
| New-recipient large email | External send well above sender baseline | T1567 | Medium |

## 3. Behavioural Baselining (UEBA)

```
Static thresholds miss insiders and over-alert on normal spikes. Baseline per entity:
  - Per-user: typical data volume, destinations, hours, apps, cloud access
  - Per-host: normal egress destinations and volume
  - Per-principal (cloud): normal API + data-access pattern

Alert on deviation (e.g., >3σ) weighted by data sensitivity and account privilege.
Risk-score the entity; escalate when multiple weak signals stack on one actor.
```

## 4. Response Playbook — Suspected Exfiltration

```
TRIAGE (minutes):
  1. Confirm the alert: what data class, what volume, which channel, which actor
  2. Pull the actor's cross-layer activity (network + endpoint + email + cloud)
  3. Classify: accidental (misdirected email) vs. malicious (staged + archived + exfil)

CONTAIN:
  4. Malicious/insider: with HR+legal, suspend account, block egress, isolate endpoint
  5. Accidental: recall/expire the share, encrypt/quarantine the message, coach user
  6. Cloud: revoke keys, remove public/cross-account share, rotate credentials

INVESTIGATE:
  7. Scope: what data actually left, to where, over what window (preserve evidence)
  8. Endpoint forensic image if malicious; export DLP + proxy + CloudTrail evidence
  9. Determine breach-notification obligations (GDPR 72h, HIPAA, state laws)

RECOVER & IMPROVE:
  10. Close the exploited egress path (the gap that let data leave)
  11. Add/tune a detection so the same pattern is caught earlier next time
  12. Post-incident review; update policy mode (monitor→block) where warranted
```

## 5. Programme Metrics & Maturity

| Metric | What It Shows | Target |
|--------|--------------|--------|
| % estate classified | Foundation coverage | > 90% |
| DLP coverage per layer | No blind egress layer | All 4 layers enforced |
| False-positive rate | Policy tuning health | < 5% of alerts |
| Mean time to detect exfil | Detection efficacy | Trending down |
| Mean time to contain | Response efficacy | < 4h for Critical |
| Repeat-incident rate | Learning loop working | Trending to 0 |

```
Maturity ladder:
  L1 Reactive  — email/endpoint DLP only, monitor mode, no correlation
  L2 Defined   — classification done, all layers in monitor, basic alerts
  L3 Managed   — block mode on Restricted, cross-layer correlation, UEBA
  L4 Optimised — risk-adaptive policy, automated response, closed learning loop
```

## ATT&CK Mapping
T1074 Data Staged · T1560 Archive Collected Data · T1030 Data Transfer Size Limits · T1041 Exfiltration Over C2 · T1048 Exfil Over Alternative Protocol · T1567 Exfil Over Web Service · T1052 Exfil Over Physical Medium · T1530 Data from Cloud Storage · T1537 Transfer Data to Cloud Account · T1213 Data from Information Repositories
