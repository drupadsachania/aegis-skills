# Patch Management — Reference

Use during Phase 3 to prioritise and track vulnerability remediation across the infrastructure.

## Patch Priority Framework

Combine CVSS score with CISA KEV (Known Exploited Vulnerabilities) status and asset tier to determine SLA.

| Priority | Criteria | SLA | Example |
|----------|----------|-----|---------|
| P0 — Emergency | CISA KEV + Tier 1 asset | 24 hours | CVE on KEV list affecting a DC or PAM server |
| P1 — Critical | CVSS ≥ 9.0 OR CISA KEV + Tier 2 | 72 hours | RCE CVE on production database |
| P2 — High | CVSS 7.0–8.9, exploitable remotely | 14 days | Authentication bypass on application server |
| P3 — Medium | CVSS 4.0–6.9, local or complex exploit | 30 days | Privilege escalation requiring local access |
| P4 — Low | CVSS < 4.0 | 90 days | Information disclosure, minimal impact |

## Tooling by Platform

| Platform | Scanning Tool | Deployment Tool | Notes |
|----------|-------------|----------------|-------|
| Windows Server/Workstation | Tenable / Qualys | WSUS + SCCM / Intune | Enable Windows Update for Business for cloud workstations |
| Linux (Debian/Ubuntu) | Tenable / Trivy | Ansible `apt` module | Unattended-upgrades for security patches |
| Linux (RHEL/CentOS) | Tenable / OpenSCAP | Ansible `yum` module, Satellite | Subscribe to RHEL errata |
| Containers | Trivy, Snyk Container | CI/CD pipeline gate | Scan images at build; re-scan in registry weekly |
| Cloud (AWS) | AWS Inspector v2 | SSM Patch Manager | Use patch baselines per OS |
| Network devices | Tenable.io | Vendor CLI / Ansible | Schedule maintenance windows |

## Vulnerability Workflow

```
Scan → Triage (CVSS + KEV + Asset Tier) → Assign (P0–P4) → Patch → Verify → Close
```

## Monthly Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0/P1 patch compliance | 100% within SLA | Vuln scanner + CMDB cross-reference |
| P2 patch compliance | ≥ 95% within 14 days | Vuln scanner report |
| Mean Time to Patch (MTTP) — Critical | < 72 hours | Ticket open → close timestamp |
| Patch coverage (agents installed) | ≥ 98% of in-scope assets | Scanner vs CMDB |

## CISA KEV Integration

```bash
# Download latest KEV catalogue
curl -s https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json \
  | jq '.vulnerabilities[] | select(.dueDate != null) | {cveID, vendorProject, product, dueDate}'
```

Cross-reference KEV CVEs against your vulnerability scanner output daily. P0 override any existing priority rating.
