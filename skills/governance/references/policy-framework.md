# Policy Framework

## Purpose
Establish a coherent, maintained security policy hierarchy aligned to ISO 27001 and NIST CSF.

---

## 1. Policy Hierarchy

| Level | Document Type | Audience | Approval | Review |
|-------|--------------|----------|---------|--------|
| 1 | Policy | All staff, Board | Board/CEO | Annual |
| 2 | Standard | Technical/Operations | CISO | Annual |
| 3 | Procedure | Operations team | IT Manager | Biannual |
| 4 | Guideline | Practitioners | Team Lead | As needed |

- **Policy**: High-level intent and commitment (e.g., "The organisation will protect information assets")
- **Standard**: Mandatory measurable requirements (e.g., "Passwords must be minimum 12 characters")
- **Procedure**: Step-by-step instructions (e.g., "How to provision a new user account")
- **Guideline**: Recommended best practices, not mandatory

---

## 2. Core Security Policies Required

### Mandatory Policy Suite (ISO 27001 / NIST CSF)
```
1. Information Security Policy (master policy)
2. Acceptable Use Policy
3. Access Control Policy
4. Cryptography Policy
5. Information Classification and Handling Policy
6. Incident Management Policy
7. Business Continuity and Disaster Recovery Policy
8. Change Management Policy
9. Vendor and Third-Party Security Policy
10. Physical Security Policy
11. Remote Working Policy
12. Secure Development Policy
13. Data Retention and Disposal Policy
14. Vulnerability Management Policy
```

---

## 3. Policy Lifecycle Management

### Annual Review Process
```
Month 1:  CISO initiates policy review cycle; notifies all policy owners
Month 2:  Policy owners review and update their policies
Month 3:  CISO reviews changes; legal/HR/IT review cross-functional impacts
Month 4:  Updated policies presented to Security Steering Committee for approval
Month 5:  Board approval for master policy and any significant changes
Month 6:  Published to intranet/GRC platform; staff notified
Ongoing:  Staff acknowledgement tracked; non-acknowledgement escalated
```

### Version Control Fields
```
Policy Name, Policy ID, Version, Status (Draft/Review/Approved/Retired),
Owner, Approver, Effective Date, Review Date, Change History,
Distribution (All Staff / IT / Executives)
```

---

## 4. Exception Management Process

```
POLICY EXCEPTION REQUEST
=========================
Exception ID:      EXC-<YYYY>-<nnnn>
Requested By:      <Name, Role, Business Unit>
Date:              <YYYY-MM-DD>
Policy Violated:   <Policy Name, Section>
Description:       <What cannot be complied with and why>
Business Justification: <Business reason>
Risk Assessment:   <Likelihood + Impact + Risk Level>
Compensating Controls: <What mitigates the risk>
Duration:          <time-limited: max 12 months>
Risk Owner:        <Business VP/Director who accepts the risk>
CISO Approval:     <Signature + Date>
Board Notification: <Required if risk = High/Critical>
Review Date:       <Date to reassess>
```

---

## 5. Staff Acknowledgement Tracking

```
Requirements:
- New staff: acknowledge all policies within first 5 working days
- Annual renewal: all staff acknowledge by specific date
- Policy update: acknowledgement required within 10 working days

Tracking metrics:
- Acknowledgement rate by department
- Overdue acknowledgements (escalate > 30 days overdue to manager)
- Exception rate (track declining acknowledgements as training indicator)

Tools: GRC platform, ServiceNow, or SharePoint acknowledgement workflow
```

---

## 6. Gap Analysis Against ISO 27001 Annex A

```
Map each policy to ISO 27001:2022 Annex A controls:
  Information Security Policy → A.5.1 Policies for information security
  Access Control Policy       → A.8.2, A.8.3, A.8.4, A.8.5
  Cryptography Policy         → A.8.24 Use of cryptography
  Incident Management Policy  → A.5.24, A.5.25, A.5.26
  Vendor Policy               → A.5.19, A.5.20, A.5.21, A.5.22

Document:
  [ ] Policy exists: Y/N
  [ ] Covers all relevant controls: Y/Partial/N
  [ ] Approved and current: Y/N (within 12 months)
  [ ] Staff aware and acknowledged: Y/N
  [ ] Gap description (if partial/no)
```
