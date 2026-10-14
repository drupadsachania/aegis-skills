# Standard Mapping

## Purpose
Map organisational controls to applicable compliance frameworks and identify coverage, gaps, and overlapping requirements.

---

## 1. SOC 2 Trust Service Criteria

### Common Criteria (CC) — Required for All SOC 2 Reports
| Criteria | Description | Key Controls |
|----------|-------------|-------------|
| CC1 | Control Environment | Management philosophy, board oversight, integrity |
| CC2 | Communication & Information | Internal/external communications, risk awareness |
| CC3 | Risk Assessment | Risk identification, analysis, change management |
| CC4 | Monitoring | Internal audit, corrective actions |
| CC5 | Control Activities | Policies, procedures, technology deployment |
| CC6 | Logical & Physical Access | Authentication, authorisation, least privilege |
| CC7 | System Operations | Incident detection, recovery, anomaly management |
| CC8 | Change Management | SDLC, change authorisation, testing |
| CC9 | Risk Mitigation | Vendor risk, business continuity |

### Additional TSCs (Opt-in)
```
Availability (A1):      Performance monitoring, disaster recovery, capacity planning
Confidentiality (C1):   Identification, protection, retention/disposal of confidential info
Processing Integrity:   Complete, accurate, timely processing
Privacy (P series):     GDPR/CCPA aligned notice, consent, use, quality, monitoring
```

---

## 2. ISO 27001:2022 Annex A Controls

### 4 Control Themes (93 controls total)
| Theme | Controls | Examples |
|-------|----------|---------|
| Organisational (A.5) | 37 controls | Policies, roles, threat intelligence, supplier security |
| People (A.6) | 8 controls | Screening, training, NDAs, remote working |
| Physical (A.7) | 14 controls | Perimeter security, equipment, clean desk |
| Technological (A.8) | 34 controls | Access control, crypto, malware, logging, backup |

### Key New Controls in ISO 27001:2022
```
A.5.7  Threat intelligence
A.5.23 Security for cloud services
A.5.30 ICT readiness for business continuity
A.7.4  Physical security monitoring
A.8.9  Configuration management
A.8.10 Information deletion
A.8.11 Data masking
A.8.12 Data leakage prevention
A.8.16 Monitoring activities
A.8.23 Web filtering
A.8.28 Secure coding
```

---

## 3. PCI-DSS v4.0 Requirements

| Req | Title | Key Controls |
|-----|-------|-------------|
| 1 | Install and maintain network security controls | Firewall rules, network segmentation, documentation |
| 2 | Apply secure configurations | Change defaults, disable unused services, configuration standards |
| 3 | Protect stored account data | Encryption of PAN at rest, retention limits, masking |
| 4 | Protect data in transit | TLS 1.2+ for all transmissions of CHD |
| 5 | Protect against malware | Anti-malware, anti-phishing, regular updates |
| 6 | Develop and maintain secure systems | Patching SLAs (critical: 1 month), SDLC, code review |
| 7 | Restrict access by business need | RBAC, least privilege, access reviews |
| 8 | Identify users and authenticate | MFA for all admin access, password standards |
| 9 | Restrict physical access | Visitor logs, media controls, device protection |
| 10 | Log and monitor all access | Audit logs, tamper protection, log review |
| 11 | Test security regularly | Vulnerability scans (quarterly), pen test (annual), IDS/IPS |
| 12 | Support security with policies | Security policy, risk assessment, training, TPRM |

### SAQ Type Selection
| SAQ | Who it applies to |
|-----|-------------------|
| SAQ A | E-commerce, all card functions outsourced, no storage |
| SAQ B | Imprint machines or standalone dial-out terminals only |
| SAQ C | POS applications on internet-connected devices |
| SAQ D-Merchant | All merchants not qualifying for A-C |
| SAQ D-SP | Service providers |
| SAQ P2PE-HW | Hardware-only P2PE solution |

---

## 4. HIPAA Security Rule Safeguards

### Administrative Safeguards (§164.308)
```
Risk Analysis (Required): Identify threats, vulnerabilities, likelihoods
Risk Management (Required): Implement security measures to reduce risk
Sanction Policy (Required): Workforce penalties for violations
Workforce Training (Required): Security awareness training
Access Management (Required): Formal authorisation process for ePHI access
Incident Response (Required): Policy for security incidents
Contingency Plan (Required): DR/BC for ePHI systems
Business Associate Agreements: BAAs for all BAs with ePHI access
```

### Technical Safeguards (§164.312)
```
Access Controls (Required): Unique user IDs, emergency access, auto logoff, encryption
Audit Controls (Required): Hardware/software activity logs
Integrity Controls (Addressable): Mechanisms to authenticate ePHI
Transmission Security (Addressable): Encryption in transit
```

---

## 5. GDPR Article 32 Technical Measures

```
Required measures (risk-appropriate):
  a) Pseudonymisation and encryption of personal data
  b) Ongoing confidentiality, integrity, availability, resilience of systems
  c) Ability to restore availability after incident (DR/BC)
  d) Regular testing of security measures (risk assessments, pen tests)

Additional GDPR obligations:
  Art. 25: Data protection by design and by default
  Art. 30: Records of processing activities (ROPA)
  Art. 33: Breach notification within 72 hours to supervisory authority
  Art. 35: DPIA for high-risk processing
  Art. 37-39: DPO requirement criteria
```

---

## 6. NIST CSF 2.0 Function Mapping

| Function | Description | Key Categories |
|----------|-------------|---------------|
| Govern (GV) | Cybersecurity risk strategy, expectations, policy | GV.OC, GV.RM, GV.RR, GV.PO, GV.OV, GV.SC |
| Identify (ID) | Understand assets, risks, supply chain | ID.AM, ID.RA, ID.IM |
| Protect (PR) | Safeguards to manage risk | PR.AA, PR.AT, PR.DS, PR.IR, PR.PS |
| Detect (DE) | Identify cybersecurity incidents | DE.AE, DE.CM |
| Respond (RS) | Actions after incident | RS.MA, RS.AN, RS.CO, RS.MI |
| Recover (RC) | Restoration of capabilities | RC.RP, RC.CO |

---

## 7. Cross-Framework Control Mapping (Sample)

| Control Area | SOC 2 | ISO 27001 | PCI-DSS | NIST CSF | CIS v8 |
|-------------|-------|-----------|---------|----------|--------|
| MFA | CC6.1 | A.8.2, A.8.5 | Req 8.4 | PR.AA-03 | CIS 6 |
| Encryption at rest | CC6.1, C1.1 | A.8.24 | Req 3.5 | PR.DS-01 | CIS 3 |
| Patch management | CC7.1 | A.8.19, A.8.8 | Req 6.3 | PR.PS-02 | CIS 7 |
| Logging/monitoring | CC7.2, CC7.3 | A.8.15, A.8.16 | Req 10 | DE.CM-01 | CIS 8 |
| Incident response | CC7.3, CC7.4 | A.5.26, A.5.24 | Req 12.10 | RS.MA | CIS 17 |
| Vendor management | CC9.2 | A.5.19-A.5.22 | Req 12.8 | GV.SC | CIS 15 |
