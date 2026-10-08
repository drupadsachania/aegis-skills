# Risk Prioritisation — Reference

Use during Phase 4 to score, rank, and produce a remediation roadmap for all identified attack surface findings.

## Scoring Framework

Score each finding across four dimensions (1–3 each), then multiply exploitability × exposure and add criticality + data sensitivity.

**Formula:** `Risk Score = (Exploitability × Exposure) + Criticality + Data Sensitivity`

| Dimension | Score 1 | Score 2 | Score 3 |
|-----------|---------|---------|---------|
| Exploitability | Complex exploit; requires authentication | Moderate; public PoC exists | Trivial; automated exploit available |
| Exposure | Internal only; requires network access | Semi-public; requires VPN/auth | Fully public internet-facing |
| Criticality | Non-critical asset | Business-critical | Crown jewel / regulatory scope |
| Data Sensitivity | Public data | Internal data | PII / PAN / credentials / secrets |

**Max score: 15. Risk tiers:**
- **Critical (12–15):** Immediate action, 24-hour SLA
- **High (9–11):** 72-hour SLA
- **Medium (6–8):** 14-day SLA
- **Low (2–5):** 30-day SLA

## Priority Tiers with SLAs

| Tier | Score | SLA | Example | Owner |
|------|-------|-----|---------|-------|
| Critical | 12–15 | 24 hours | Public S3 bucket with PAN data | CISO + Cloud Team |
| High | 9–11 | 72 hours | RDP exposed to internet with weak password | IT Ops |
| Medium | 6–8 | 14 days | Subdomain pointing to decommissioned service | App Team |
| Low | 2–5 | 30 days | SSL certificate with weak cipher on internal tool | Platform |

## Remediation Roadmap Template

| # | Finding | Score | Tier | Remediation Action | Owner | Due Date | Status |
|---|---------|-------|------|-------------------|-------|----------|--------|
| 1 | S3 bucket `backups-prod` publicly accessible | 14 | Critical | Apply Block Public Access policy; audit bucket policy | Cloud Team | 2025-06-25 | Open |
| 2 | RDP exposed on vpn-gw01 (203.0.113.10:3389) | 11 | High | Restrict SGP rule to corporate IP range only | IT Ops | 2025-06-27 | Open |
| 3 | Subdomain `old-portal.example.com` → dangling DNS | 7 | Medium | Remove DNS record; claim subdomain if subdomain takeover risk | Web Team | 2025-07-08 | Open |

## Continuous Monitoring Requirements

After initial remediation, establish ongoing exposure monitoring:

| Control | Tooling | Frequency |
|---------|---------|-----------|
| Internet port scan of all known IPs | Shodan Monitor or custom nmap cron | Weekly |
| New subdomain discovery | subfinder + monitoring | Daily |
| Cloud misconfiguration | Prowler / AWS SecurityHub | Daily |
| New CVE matching exposed software versions | Tenable / Qualys + CISA KEV | Daily |
| Certificate expiry monitoring | cert-manager / monitoring platform | Weekly |
| Dark web / credential exposure | HaveIBeenPwned API, threat intel | Weekly |
