# Risk Treatment

## Purpose
Select appropriate treatment for each identified risk, document rationale, implement controls, and reassess residual risk.

---

## 1. Treatment Options

### Accept
```
Criteria:
  - Residual risk within risk appetite
  - Cost of control exceeds benefit
  - No cost-effective control exists

Requirements:
  - Documented risk owner sign-off (named individual, not role)
  - CISO awareness and concurrence
  - Board notification for High/Critical accepted risks
  - Defined review date (annual maximum)
  - Logged in risk register with acceptance rationale

Template:
  I, <Name, Title>, accept the residual risk of <risk title> (score: <n>)
  on behalf of <Business Unit>. I understand that this risk may materialise
  and accept responsibility for any resulting business impact.
  Accepted: <date>  Review: <date>
```

### Mitigate
```
Control selection framework:
  1. Map risk to relevant framework controls:
     NIST 800-53 (US federal), CIS Controls v8, ISO 27001 Annex A
  
  2. Prioritise controls with highest risk reduction:
     - CIS Controls IG1/IG2 for most common risks
     - CISA KEV remediation for exploited vulnerabilities
     - ATT&CK mitigations for specific techniques
  
  3. Document:
     - Control name and description
     - Implementation timeline
     - Responsible party (RACI)
     - How control effectiveness will be measured
     - Expected residual risk after implementation
```

### Transfer
```
Mechanisms:
  Cyber Insurance:
    Coverage types: first-party (response costs, business interruption),
                    third-party (liability to customers/regulators)
    Key considerations:
      - Aggregate limit vs per-incident limit
      - Exclusions (war exclusions, systemic risk like SolarWinds)
      - Sublimits for ransomware payments
      - Retention/deductible (typically $250k-$1M for enterprise)
    
    Gap analysis: Ensure insured loss events map to your risk register

  Contractual Transfer:
    SLAs with vendors (service credit for downtime)
    BAA/DPA for regulatory liability transfer
    Indemnification clauses for vendor-caused breaches
    Note: Regulatory liability cannot be fully transferred (GDPR: controller remains accountable)
```

### Avoid
```
Risk avoidance = eliminate the activity that creates the risk

Examples:
  - Discontinue storing CHD (removes PCI-DSS scope)
  - Migrate to managed SaaS (eliminates self-managed server risk)
  - Terminate a high-risk vendor relationship
  - Disable a legacy system with no viable patching

Document: business impact of avoidance and explicit decision by accountable owner
```

---

## 2. Control Selection Framework

### CIS Controls v8 Implementation Groups
| Implementation Group | Target Organisation | Focus |
|---------------------|---------------------|-------|
| IG1 (Essential) | Small organisations; limited IT resources | 56 safeguards (basic hygiene) |
| IG2 (Medium) | Mid-size; IT and security staff present | IG1 + additional 74 safeguards |
| IG3 (High) | Large; dedicated security team | All 153 safeguards |

### Top CIS Controls by Risk Reduction (Foundational)
```
CIS 1: Inventory of Enterprise Assets → T1200, T1078 mitigations
CIS 2: Inventory of Software → T1072, T1059 mitigations
CIS 3: Data Protection → T1048, T1485 mitigations
CIS 4: Secure Configuration → T1098, T1190 mitigations
CIS 5: Account Management → T1078, T1136 mitigations
CIS 6: Access Control (MFA) → T1078.001, T1078.003 mitigations
CIS 7: Continuous Vulnerability Management → all exploitation techniques
CIS 8: Audit Log Management → T1070, T1562 mitigations
```

---

## 3. Treatment Documentation Template

```
RISK TREATMENT RECORD
======================
Risk ID:          RISK-<YYYY>-<nnn>
Risk Title:       <Ransomware attack on ERP system>
Inherent Score:   20 (Critical) — L4 × I5
Treatment Decision: Mitigate + Transfer
Risk Owner:       <VP Technology>

Mitigating Controls (to implement):
  CTL-001: Deploy EDR on all servers (CIS 10.1)
           Owner: IT Security | Due: 2026-09-01 | Status: In Progress
  CTL-002: Immutable backup solution
           Owner: IT Operations | Due: 2026-08-01 | Status: Complete
  CTL-003: Phishing-resistant MFA for all admin accounts (CIS 6.3)
           Owner: IT Security | Due: 2026-07-01 | Status: Complete

Cyber Insurance:
  Policy: <Insurer> | Limit: $10M | Retention: $500k
  Coverage confirmed for ransomware events: Yes

Expected Residual Score: 8 (Medium) — L2 × I4
Actual Residual Score: <assessed after control implementation>

Review Date: 2027-06-01
Next Risk Review: Quarterly (due to High residual)
```

---

## 4. Post-Treatment Residual Risk Assessment

After implementing mitigating controls:
1. Re-assess likelihood with controls in place (reduce likelihood score)
2. Re-assess impact (note: controls rarely reduce impact of a successful attack, but may limit blast radius)
3. Calculate new residual score
4. If residual score still exceeds risk appetite threshold:
   - Identify additional controls
   - Formal risk acceptance by appropriate authority
   - Board notification if Critical remains after treatment

---

## 5. Treatment Prioritisation

| Priority | Criteria | Timeline |
|----------|---------|---------|
| P1 Critical | Residual risk Critical; active exploitation; regulatory exposure | Immediate (< 30 days) |
| P2 High | Residual High; known threat actor interest; significant business impact | 60 days |
| P3 Medium | Residual Medium; theoretical exploitation; moderate impact | 90 days |
| P4 Low | Residual Low; minimal exploitation likelihood; low impact | 180 days |
