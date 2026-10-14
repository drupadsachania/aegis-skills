# Control Assessment

## Purpose
Evaluate the design and operating effectiveness of controls against applicable compliance standards, identify gaps, and document findings.

---

## 1. Control Testing Methodology

### Four Testing Methods
| Method | Description | When to Use |
|--------|-------------|-------------|
| Inquiry | Interview control owners, ask questions | Initial scoping, understanding process |
| Observation | Watch control being performed | Physical controls, manual processes |
| Inspection | Review documentation, configs, logs | Policy reviews, system configs, reports |
| Re-performance | Independently execute control test | Automated controls, reconciliations |

**Auditor standard**: Inquiry alone is NOT sufficient for evidence of operating effectiveness. Combine with inspection or re-performance.

---

## 2. Design vs Operating Effectiveness

| Assessment Type | Question | Evidence |
|----------------|---------|---------|
| Design Adequacy | Would the control, if operating effectively, prevent/detect the risk? | Policy document, procedure description |
| Operating Effectiveness | Is the control actually working as designed, consistently, over the period? | Transaction testing, logs, reports, interview + re-performance |

SOC 2 Type I = design only (point in time)
SOC 2 Type II = operating effectiveness (6-12 month period)

---

## 3. Gap Classification

| Gap Type | Definition | Severity |
|----------|-----------|---------|
| Missing Control | No control exists to address the requirement | Critical / High |
| Partially Implemented | Control exists but incomplete (e.g., MFA for some but not all users) | Medium / High |
| Evidence Gap | Control exists and operates but evidence collection is inadequate | Low / Medium |
| Documented Gap | Control operates but not formally documented | Low |
| Exception | Control exists but individual exceptions not managed/tracked | Low / Medium |

---

## 4. Control Testing Worksheet

```
Control Reference:    <SOC 2 CC6.1 / PCI Req 8.4 / ISO A.8.5>
Control Title:        <Multi-factor authentication>
Control Owner:        <IT Security Manager>
Description:          <All user and administrator access to in-scope systems
                       requires MFA using TOTP or FIDO2>
Risk Addressed:       <Unauthorised access via compromised credentials>

Design Assessment:
  Adequate? [Y/N]:     Y
  Notes:               Policy documented; FIDO2 preferred; TOTP accepted

Operating Effectiveness Testing:
  Period Tested:        Jan 2026 – Jun 2026
  Test Method:          Inspection (report) + Re-performance (test login)
  Population:           450 user accounts in scope
  Sample Size:          25 (based on AICPA sampling guidance)
  Sample Selection:     Random using Excel RAND() function
  Exceptions Found:     3 accounts missing MFA (2 service accounts, 1 guest)
  Exception Rate:       12% (3/25)
  
Finding:
  Type:                 Partially Implemented
  Severity:             High
  Description:          3 of 25 sampled accounts lack MFA
  Root Cause:           Service account MFA exemption policy not reviewed
  Recommendation:       Apply MFA to service accounts or compensating controls
```

---

## 5. Compensating Control Documentation

When a required control cannot be implemented as specified:

```
Compensating Control Documentation
=====================================
Standard Requirement:     <PCI-DSS Req 8.4.1 — MFA for all non-console admin access>
Reason Control Cannot Be Met: <Legacy system does not support MFA>
Compensating Control(s) Implemented:
  1. Jump server with MFA required for access to legacy system
  2. Session recording on all legacy system access
  3. Admin access limited to named accounts (no shared accounts)
  4. Access review quarterly
Risk Assessment:          Residual risk assessed as MEDIUM; accepted by CISO <date>
QSA Approval Required:    Yes (for PCI-DSS compensating controls)
Review Date:              <date>
```

---

## 6. Cloud Service Provider Control Inheritance

### AWS Shared Responsibility Matrix (Sample)
| Control Area | AWS Responsibility | Customer Responsibility |
|-------------|-------------------|------------------------|
| Physical security | AWS (ISO 27001 certified) | N/A — inherit |
| Network controls | Shared | Customer VPC configuration |
| OS patching | Customer (EC2) | Customer applies patches |
| Application security | Customer | Customer owns |
| Identity (AWS IAM) | Shared | Customer configures IAM policies |
| Data encryption | Shared | Customer enables and manages keys |

### Third-Party Attestation Review
```
For cloud/SaaS providers with their own compliance certifications:
1. Obtain provider's SOC 2 Type II report (review period overlap)
2. Review: scope, subservice organisations, exceptions, management responses
3. Check: does provider's scope cover YOUR use case?
4. Complementary User Entity Controls (CUECs): controls YOU must implement
5. ISO certificate: verify issuing CA, certificate scope, expiry date

Key questions:
  - Does the report cover the systems that process your data?
  - Are there any qualified opinions or exceptions?
  - Have all exceptions been remediated or have compensating controls?
  - Do CUECs align with your control implementation?
```

---

## 7. Assessment Checklist

- [ ] All in-scope controls identified and mapped to requirements
- [ ] Control owner confirmed for each control
- [ ] Design adequacy assessed for all controls
- [ ] Testing period defined (SOC 2 Type II: minimum 6 months)
- [ ] Sample size determined per AICPA/audit guidance
- [ ] All test results documented in working papers
- [ ] Exceptions quantified and root causes identified
- [ ] Compensating controls documented where applicable
- [ ] Cloud provider attestations reviewed and CUECs documented
- [ ] Gap register populated with all findings
- [ ] Findings rated by severity and regulatory impact
- [ ] Draft findings reviewed with control owners (management response)
