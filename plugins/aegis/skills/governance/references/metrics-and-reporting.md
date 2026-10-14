# Metrics and Reporting

## Purpose
Design meaningful security KPIs, KRIs, and reporting for different audiences from board-level to operational teams.

---

## 1. KPI Examples (Key Performance Indicators)

| KPI | Description | Target | Frequency |
|-----|-------------|--------|-----------|
| MFA adoption rate | % accounts with MFA enabled | > 98% | Monthly |
| Patch compliance (critical) | % critical CVEs patched within SLA | > 95% | Monthly |
| Mean time to patch (critical) | Avg days to patch critical CVEs | < 15 days | Monthly |
| Security training completion | % staff completed annual training | > 95% | Annual/Quarterly |
| Phishing simulation click rate | % staff clicking simulated phishing | < 5% | Quarterly |
| Vulnerability scan coverage | % in-scope assets scanned monthly | > 99% | Monthly |
| Incident response SLA | % P1 incidents responded to in < 1h | > 95% | Monthly |
| Access review completion | % overdue access reviews | < 2% | Quarterly |
| Policy acknowledgement rate | % staff who acknowledged all policies | > 95% | Annual |
| Pen test finding remediation | % critical pen test findings closed | > 90% in 30d | Post-test |

---

## 2. KRI Examples (Key Risk Indicators)

| KRI | Threshold (Amber) | Threshold (Red) | Frequency |
|-----|-------------------|-----------------|-----------|
| Overdue critical vulnerabilities | > 5 | > 20 | Weekly |
| Failed pen test critical findings | Any open > 30 days | Any open > 60 days | Monthly |
| Third-party security incidents | 1 per quarter | > 2 per quarter | Quarterly |
| Data breach near-misses | 1 per month | > 3 per month | Monthly |
| Unpatched admin accounts | > 2 | > 5 | Weekly |
| SoD violations | > 5 | > 20 | Monthly |
| Mean time to detect (MTTD) | > 48 hours | > 1 week | Monthly |
| Privileged accounts without MFA | Any | Any | Immediate |
| Days since last DR test | > 365 | > 730 | Ongoing |
| Overdue vendor assessments | > 5% | > 15% | Quarterly |

---

## 3. Board-Level Reporting Format

### Quarterly Board Report Structure
```
INFORMATION SECURITY REPORT — BOARD Q<n> <YEAR>
=================================================
1. EXECUTIVE SUMMARY (1/2 page)
   - Key security posture sentence
   - Any material incidents during period
   - Programme highlights
   - 1-2 key risks requiring board awareness

2. SECURITY POSTURE SCORECARD
   [Risk Heat Map: 5x5 grid showing top risks by likelihood x impact]
   [Trend vs prior quarter: arrows up/down/stable per domain]
   
   Domain          Status    Trend    Score
   ─────────────────────────────────────────
   Identity/Access GREEN     →        8/10
   Endpoint        AMBER     ↑        6/10
   Cloud           GREEN     →        7/10
   Third Party     AMBER     ↓        5/10
   Resilience      GREEN     →        8/10

3. KEY METRICS (3-5 metrics maximum)
   - MFA adoption: 97% (target: 98%)
   - Critical patch compliance: 92% (target: 95%) [AMBER]
   - Security training: 94% (target: 95%)

4. PROGRAMME PROGRESS (vs plan)
   - Initiatives on track vs off track
   - Budget spend vs plan
   - Key milestones achieved

5. TOP RISKS
   [Table: risk, current rating, treatment status, expected resolution]

6. KEY INCIDENTS
   [Brief summary of any material incidents; no sensitive detail]

7. REGULATORY UPDATE
   [Any upcoming compliance obligations or regulatory changes]
```

---

## 4. Security Scorecard Design

### Weighted Domain Scorecard
```
Domain               Weight  Score  Weighted  Status
─────────────────────────────────────────────────────
Identity & Access    25%     7.5    1.875     AMBER
Endpoint Security    15%     8.0    1.200     GREEN
Network Security     15%     7.0    1.050     AMBER
Application Security 15%     6.0    0.900     AMBER
Cloud Security       10%     7.5    0.750     GREEN
Data Protection      10%     8.0    0.800     GREEN
Third-Party Risk     5%      5.0    0.250     AMBER
Resilience          5%      8.5    0.425     GREEN
─────────────────────────────────────────────────────
TOTAL               100%           7.25      AMBER

Score interpretation:
  GREEN  = 8.0 - 10.0
  AMBER  = 6.0 - 7.9
  RED    = 0.0 - 5.9
```

---

## 5. Reporting Frequency by Audience

| Audience | Frequency | Format | Content Focus |
|----------|-----------|--------|--------------|
| Board | Quarterly | 2-page report + heat map | Risk posture, top risks, programme progress |
| CISO/Executives | Monthly | Dashboard + narrative | KPIs, KRIs, incidents, emerging threats |
| Security Steering | Monthly | Full dashboard + agenda | Programme performance, approvals needed |
| SOC/Operations | Weekly | Operational dashboard | Open incidents, overdue patches, alerts |
| Threat Intel | Daily | Briefing + IOC updates | New threats, active campaigns |
