# Risk Reporting

## Purpose
Communicate risk posture effectively to executive and board audiences, track trends, and meet regulatory reporting requirements.

---

## 1. Executive Risk Dashboard Design

### Dashboard Components
```
1. RISK HEAT MAP (5x5 grid)
   Plot all open risks by likelihood and impact
   Use colour coding: Red=Critical, Orange=High, Yellow=Medium, Green=Low
   Include previous quarter positions to show trend direction

2. TOP 10 RISKS TABLE
   | Rank | Risk Title | Current Score | vs Prior | Treatment | Owner | Due |
   Show movement: arrows (up/down/stable) vs prior quarter

3. TREATMENT STATUS SUMMARY
   By category: In Treatment / Accepted / Not Started / Overdue
   Progress bar per severity band

4. NEW AND CLOSED RISKS
   New risks this period: <n>
   Risks closed this period: <n>
   Net change: <+n / -n>

5. RISK APPETITE COMPLIANCE
   Number of risks exceeding appetite by tier:
     Critical with no treatment plan: <n> (target: 0)
     High open > 90 days: <n> (target: < 3)
```

---

## 2. Risk Trend Analysis

### Trend Metrics (Quarter-over-Quarter)
```
Risk Portfolio Summary:
                      Q2 2026    Q1 2026    Change
Critical risks:          2          4        -2 (improvement)
High risks:             8          7        +1 (new risk added)
Medium risks:          15         16        -1
Low risks:             12         11        +1
Total open:            37         38        -1

Average residual score:  7.8       8.2      -0.4 (improvement)

Risks by domain:
  Cyber (technical):   18
  Third-party:          8
  Operational:          7
  Regulatory:           4

Treatment velocity:
  Risks closed this quarter:    6
  Average days open for closed: 45 days
```

---

## 3. Risk Posture Narrative

### Executive Summary Template
```
RISK POSTURE SUMMARY — Q2 2026
================================

Overall posture: AMBER (Moderate Risk)

The organisation's risk posture has improved marginally quarter-over-quarter,
with 2 Critical risks resolved through successful control implementation.
The overall residual risk score decreased from 8.2 to 7.8 (out of 25).

Key positive developments:
  - EDR deployment completed across all server infrastructure
  - Immutable backup solution fully operational (ransomware risk reduced to Medium)
  - Privileged access management implemented for 95% of admin accounts

Key concerns:
  - Third-party risk in AMBER due to 3 critical vendors overdue for reassessment
  - Legacy ERP system remains a Medium risk pending upgrade (scheduled Q4)
  - New emerging risk: AI system prompt injection identified (added to register)

Risks requiring Board attention:
  - RISK-2026-002: Supply chain compromise — treatment plan approved but
    implementation delayed; revised target Q4 2026; CISO monitoring weekly
```

---

## 4. Risk Appetite Compliance Report

```
RISK APPETITE COMPLIANCE REPORT
=================================
Organisation Risk Appetite Statement:
  "We accept Medium operational risks; we do NOT accept Critical risks without
   an approved treatment plan and timeline."

Compliance Status:
  Critical risks with no treatment plan:      0  ✓ COMPLIANT
  Critical risks accepted without Board note:  0  ✓ COMPLIANT
  High risks open > 90 days:                  2  AMBER (target: < 3)
  High risks with no owner assigned:          0  ✓ COMPLIANT

Breach of appetite this period:
  RISK-2026-007 (New): Unpatched RCE in legacy system (Critical, L5×I5)
  Status: Treatment plan approved; emergency patching in progress
  Board notification: Sent 2026-06-01
  Expected compliance: 2026-06-15
```

---

## 5. Regulatory Risk Reporting Requirements

### Selected Regulatory Requirements
| Regulation | Risk Reporting Requirement |
|------------|--------------------------|
| DORA (EU) | Annual ICT risk reporting to regulatory authorities; incident reporting |
| NYDFS (NY) | Annual certification by CISO to Superintendent; risk assessment required |
| PCI-DSS | Annual risk assessment; quarterly vulnerability scans |
| HIPAA | Annual risk analysis; risk management programme |
| NERC CIP | CIP-002 risk-based categorisation of BES Cyber Systems |
| GDPR Art 32 | Regular testing and evaluation of technical measures |

### Board Risk Reporting Format for Regulated Entities
```
For regulated financial services / healthcare:
  1. Risk appetite statement (board-approved, reviewed annually)
  2. Top 10 material ICT/cyber risks with residual scores
  3. Inherent vs residual risk comparison (controls effectiveness)
  4. Treatment plan status and timeline
  5. Incidents and near-misses with root cause analysis
  6. Control deficiencies and remediation timeline
  7. Emerging risks identified this period
  8. Benchmarking vs sector (if available)
```
