# Evidence Collection

## Purpose
Collect, organise, and package evidence that demonstrates control effectiveness to auditors and regulators.

---

## 1. Evidence Requirements by Standard

### SOC 2 Evidence
| Control Area | Evidence Type | Frequency |
|-------------|--------------|-----------|
| Access reviews | Access certification reports, screenshots | Quarterly/Annual |
| Change management | Change tickets with approvals | Population-based sample |
| Vulnerability management | Scan reports, remediation tickets | Monthly/Quarterly |
| Incident response | Incident logs, post-mortems | Event-triggered |
| Backup testing | Restore test results | Annual |
| Vendor management | Vendor assessments, contract reviews | Annual |
| Security training | Training completion reports | Annual |

SOC 2 Type II: auditor takes population-based sample across full testing period. Ensure evidence is retained and accessible for entire period.

### ISO 27001 Evidence
```
Required documentation (mandatory):
  - Scope document (Clause 4.3)
  - Information security policy (Clause 5.2)
  - Risk assessment results (Clause 6.1.2)
  - Risk treatment plan (Clause 6.1.3)
  - Statement of Applicability (SoA) (Clause 6.1.3d)
  - Security objectives and plans (Clause 6.2)
  - Competence evidence (Clause 7.2)
  - Internal audit results (Clause 9.2)
  - Management review minutes (Clause 9.3)
  - Nonconformity and corrective actions (Clause 10.1)
```

### PCI-DSS v4.0 Evidence
| Requirement | Evidence |
|-------------|---------|
| Req 1 (Firewall) | Network diagrams, firewall rules export, change logs |
| Req 3 (Data at rest) | Encryption configuration screenshots, key management docs |
| Req 6 (Patching) | Patch scan reports showing last 30 days compliance |
| Req 8 (Authentication) | User account list with MFA status, AD password policy screenshot |
| Req 10 (Logging) | Log configuration screenshots, sample log review records |
| Req 11 (Testing) | ASV scan reports (quarterly), pen test report (annual) |
| Req 12 (Risk) | Completed risk assessment, security awareness training records |

---

## 2. Evidence Naming Convention

```
<Year>-<StandardCode>-<RequirementID>-<ControlDescription>-<YYYYMMDD>.<ext>

Examples:
  2026-PCI-Req8.4-MFA-Config-Screenshot-20260601.png
  2026-SOC2-CC6.1-Access-Review-Report-Q1-20260331.xlsx
  2026-ISO-A8.8-Vulnerability-Scan-Report-20260601.pdf
  2026-HIPAA-164312-Encryption-Policy-v2.1-20260601.docx
```

---

## 3. Evidence Integrity

```bash
# Hash all evidence files on collection
sha256sum 2026-PCI-Req8.4-MFA-Config-Screenshot-20260601.png > evidence_hashes.txt

# Bulk hash directory
find /evidence/ -type f -exec sha256sum {} \; > evidence_hashes.txt

# Verify hashes on submission
sha256sum -c evidence_hashes.txt
```

---

## 4. Evidence Packaging for Audit Submission

### Directory Structure
```
audit_package_<standard>_<year>/
  00_index.xlsx                    ← Evidence index with control mapping
  01_scope_and_policies/           ← Scope docs, policies, standards
  02_risk_assessment/              ← Risk register, risk treatment plan
  03_access_controls/              ← User lists, MFA configs, access reviews
  04_change_management/            ← Change tickets (sampled)
  05_vulnerability_management/     ← Scan reports, remediation evidence
  06_incident_management/          ← Incident logs, post-mortems
  07_vendor_management/            ← Vendor risk assessments, contracts
  08_training/                     ← Training completion reports
  09_backup_and_recovery/          ← Backup reports, DR test results
  10_monitoring_and_logging/       ← Log config screenshots, alert configs
  HASHES.txt                       ← SHA256 of all files
  README.txt                       ← Instructions for auditor
```

### Evidence Index Format (spreadsheet)
```
| Evidence ID | Standard | Requirement | Control | File Name | Date | Owner | Notes |
```

---

## 5. Evidence Retention Periods

| Standard | Retention Requirement |
|----------|-----------------------|
| PCI-DSS | Audit logs: 12 months online, 12 months archived; evidence: 12 months |
| HIPAA | Policies/procedures: 6 years; records: state law or 6 years minimum |
| SOC 2 | Retain supporting workpapers per audit firm policy (typically 7 years) |
| ISO 27001 | Per organisation's documented retention schedule; typically 3-7 years |
| GDPR | Only as long as necessary; justified by lawful basis |
| SOX | 7 years minimum for financial records and audit evidence |

---

## 6. Evidence Collection Checklist

- [ ] Evidence index created with all required items mapped to controls
- [ ] All evidence files named per naming convention
- [ ] All files hashed on collection (SHA256)
- [ ] Screenshots dated and include system hostname/URL in frame
- [ ] Reports show population (not just a sample)
- [ ] Configuration screenshots show all relevant settings (not cropped to hide gaps)
- [ ] Policy documents version-controlled with approval signatures
- [ ] Training records show completion date, course name, and employee name
- [ ] Evidence covers the entire assessment period (not just recent)
- [ ] Access reviews show review completion with approver identity
- [ ] Directory structure matches index
- [ ] README.txt prepared for auditor navigation
