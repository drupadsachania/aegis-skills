# Compliance Reporting — Reference

**Entry Criteria:** Scheduled audit preparation; external audit notification received; certification renewal; regulatory inquiry; post-incident regulatory obligation.

**Required Inputs:** Evidence collection outputs, security metrics, incident log, policy register, vulnerability management data.

## Framework-Specific Evidence Table

| Control Domain | ISO 27001:2022 | SOC 2 Type II | PCI DSS v4.0 | Evidence to Collect |
|---------------|---------------|--------------|--------------|---------------------|
| Access control | A.8.5 Identity Management | CC6.1 | Req 7, 8 | IAM export, access review records, MFA logs |
| Vulnerability management | A.8.8 | CC7.1 | Req 6, 11 | Scanner reports, patch compliance data, exception register |
| Logging and monitoring | A.8.15 | CC7.2 | Req 10 | SIEM config, log retention policy, alert rules |
| Incident management | A.5.26 | CC7.4 | Req 12.10 | Incident register, PIR outputs, IR test records |
| Change management | A.8.32 | CC8.1 | Req 6.3 | Change tickets, approvals, CAB minutes |
| Encryption | A.8.24 | CC6.7 | Req 3, 4 | Encryption-at-rest proof, TLS scan results |
| Physical security | A.7.2 | CC6.4 | Req 9 | Visitor logs, CCTV policy, data centre access records |
| Business continuity | A.5.29 | A1.2 | Req 12.3 | BCP/DR plan, test results, RTO/RPO documentation |
| Third-party risk | A.5.19 | CC9.2 | Req 12.8 | Vendor assessment records, contracts, review schedule |
| Security awareness | A.6.3 | CC2.2 | Req 12.6 | Training completion records, phishing simulation results |

## Regulatory Notification Deadlines Table

| Regulation | Jurisdiction | Initial Notification Window | Notify Who | Trigger |
|------------|-------------|----------------------------|-----------|---------|
| GDPR Article 33 | EU / EEA | 72 hours from becoming aware | National supervisory authority (e.g., ICO) | Personal data breach with risk to individuals |
| GDPR Article 34 | EU / EEA | Without undue delay | Affected individuals | High risk to rights and freedoms |
| HIPAA Breach Notification | USA | 60 days from discovery | HHS OCR + affected individuals (media if >500 in state) | Breach of unsecured PHI |
| NIS2 Article 23 | EU | 24 hours (early warning); 72 hours (notification); 1 month (final) | National CSIRT / competent authority | Significant incident on essential/important entity |
| PCI DSS | Global | Immediately (24 hours) | Acquiring bank + card brands | Suspected or confirmed account data compromise |
| SEC Rule 13a-15 / 15d-15 | USA (public companies) | 4 business days (8-K) | SEC public filing | Material cybersecurity incident |
| FCA SYSC 8.1 | UK (financial services) | As soon as reasonably practicable | FCA (and PRA if dual-regulated) | Significant operational incident |

## Evidence Collection Workflow

1. Map audit scope to framework controls (use table above)
2. Identify evidence owner per control domain
3. Collect evidence with timestamps and digital signatures where possible
4. Review for gaps — generate remediation actions for any missing evidence
5. Package evidence with control cross-reference index for auditor
6. Retain all audit evidence for minimum 3 years (or regulatory minimum if longer)

**Outputs:** Evidence package per framework; control test results; exception register with risk acceptance; compliance dashboard (RAG status per domain).
