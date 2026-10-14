# Compliance Validation — Reference

Use during Phase 5 to map infrastructure hardening outputs to compliance framework requirements and produce audit-ready evidence.

## Framework Mapping Table

| CIS Benchmark Control | ISO 27001:2022 | SOC 2 CC | PCI DSS v4.0 | NIST CSF |
|-----------------------|---------------|----------|--------------|----------|
| Account policies (lockout, complexity) | A.8.5 Identity Management | CC6.1 | Req 8 | PR.AC |
| Audit logging enabled | A.8.15 Logging | CC7.2 | Req 10 | DE.CM |
| Patch management | A.8.8 Vulnerability Management | CC7.1 | Req 6 | ID.RA, RS.MI |
| Firewall / host-based firewall | A.8.20 Network Security | CC6.6 | Req 1 | PR.AC |
| Encryption at rest | A.8.24 Use of Cryptography | CC6.7 | Req 3 | PR.DS |
| MFA for privileged access | A.8.5 | CC6.1 | Req 8.4 | PR.AC |
| Vulnerability scanning | A.8.8 | CC7.1 | Req 11 | ID.RA |
| Incident response plan | A.5.26 | CC7.4 | Req 12.10 | RS.RP |

## Evidence Collection Checklist

| Evidence Item | Format | Collection Method | Retention |
|---------------|--------|-------------------|-----------|
| CIS-CAT scan results | HTML/XML report | CIS-CAT Pro automated scan | 12 months |
| Patch compliance report | CSV/dashboard export | Vuln scanner or SCCM | 12 months |
| Firewall rule baseline | Exported rule set | Firewall management console | 24 months |
| User access review | CSV of accounts + permissions | AD/IAM export | 12 months |
| MFA enablement report | CSV | IdP admin console export | 12 months |
| Encryption-at-rest proof | Screenshot / API response | Cloud console / BitLocker status | 12 months |

## Compliance Gap Register Template

| Framework | Control Ref | Control Description | Status | Gap Detail | Remediation Owner | Due Date |
|-----------|-------------|--------------------|---------|-----------|--------------------|----------|
| ISO 27001 | A.8.8 | Vulnerability Management | Partial | No formal SLAs for P3/P4 vulns | CISO | 2025-09-30 |
| PCI DSS | Req 8.4 | MFA on all console access | Fail | 3 admin accounts without MFA | IAM Team | 2025-07-15 |

## Continuous Compliance Approach

Automate evidence collection using:
- **AWS Config Rules** / **Azure Policy** for cloud compliance drift detection
- **InSpec / Chef Compliance** for OS-level continuous assessment
- **OpenSCAP** for scheduled RHEL/CentOS assessments
- **Prowler** for cloud security posture management (daily scan, email digest)
