# Security Metrics — Reference

**Entry Criteria:** Monthly/quarterly reporting cycle; board presentation preparation; programme health review; budget justification.

**Required Inputs:** SIEM data, ticketing system (MTTD/MTTC/MTTR), vulnerability scanner reports, EDR telemetry, patch management data.

## Tier 1 — Operational Metrics (SOC daily/weekly)

| Metric | Definition | Measurement Source | Target |
|--------|-----------|-------------------|--------|
| Mean Time to Detect (MTTD) | Average time from first malicious event to alert | SIEM: earliest event timestamp vs alert creation time | Trending down; < 1 hour for P1 |
| Mean Time to Contain (MTTC) | Average time from alert to containment action | Incident ticket: created vs contained timestamp | < 4 hours P1; < 24 hours P2 |
| Mean Time to Recover (MTTR) | Average time from containment to full service restoration | Incident ticket: contained vs resolved timestamp | < 24 hours P1 |
| Alert-to-Incident Ratio | % of SIEM alerts that become confirmed incidents | Tickets created vs alerts generated | Baseline; use to detect alert fatigue |
| False Positive Rate | % of alerts closed as false positive | FP tickets / total alerts | < 20% (high FP rate = rule quality issue) |
| Alert Volume per Analyst per Day | Total alerts / analyst headcount / working days | SIEM + headcount | Sustainable: < 30 quality alerts/day |

## Tier 2 — Programme Metrics (Monthly/Quarterly for management)

| Metric | Definition | Target |
|--------|-----------|--------|
| Critical/High Vulnerabilities Open | Count of unpatched Critical/High CVEs beyond SLA | Zero Critical beyond SLA |
| Patch Compliance Rate | % of in-scope assets patched within SLA | ≥ 95% |
| EDR Coverage | % of in-scope endpoints with active EDR | ≥ 98% |
| Security Awareness Training Completion | % of staff completing mandatory training | ≥ 95% |
| Phishing Simulation Click Rate | % of simulated phishing emails clicked | < 5% (trending down) |
| Incidents by Category | Count of incidents per type (malware/insider/DDoS etc.) | Baseline and trend |
| Mean Cost per Incident | Total IR cost / number of incidents | Baseline; demonstrate ROI of investments |

## RAG Status Explanation

Use RAG (Red/Amber/Green) status on all metric dashboards:

| Status | Colour | Meaning | Action |
|--------|--------|---------|--------|
| Green | Within target or better | No action required; continue monitoring | — |
| Amber | Within 20% of target threshold | Monitor closely; identify root cause; remediation plan within 2 weeks | Owner to present plan at next review |
| Red | Beyond target threshold; significant concern | Immediate escalation; executive awareness; remediation plan within 72 hours | CISO briefing; board notification if material |

## Executive Dashboard Template

Present four key metrics to board/exec monthly:
1. **Incident count and severity trend** — are incidents increasing or decreasing?
2. **MTTD/MTTR trend** — is the team detecting and responding faster?
3. **Critical vulnerability exposure** — how many critical CVEs are open beyond SLA?
4. **Programme maturity score** — overall security posture (CMMI/NIST CSF tier)
