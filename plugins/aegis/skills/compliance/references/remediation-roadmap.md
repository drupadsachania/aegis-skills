# Remediation Roadmap

## Purpose
Prioritise identified compliance gaps, assign ownership, estimate effort, and build a tracked remediation plan.

---

## 1. Gap Prioritisation Matrix

### Scoring Dimensions
| Dimension | 1 | 2 | 3 | 4 | 5 |
|-----------|---|---|---|---|---|
| Regulatory Risk | Minor finding | Administrative | Significant deficiency | Material weakness | Regulatory action risk |
| Exploitability | Theoretical | Low | Medium | High | Actively exploited |
| Remediation Effort | < 1 day | 1 week | 1 month | 1 quarter | > 1 quarter |

Priority Score = Regulatory Risk × Exploitability / Remediation Effort

### Priority Bands
```
Critical (score > 20): Immediate remediation; executive escalation
High     (score 10-20): Remediate within 30 days
Medium   (score 5-10):  Remediate within 90 days
Low      (score < 5):   Remediate within 180 days or accept with documented risk
```

---

## 2. Remediation Roadmap Template

```
COMPLIANCE REMEDIATION ROADMAP
================================
Organisation: <name>
Standard(s): <PCI-DSS v4.0 / SOC 2 / ISO 27001>
Assessment Date: <YYYY-MM-DD>
Roadmap Owner: <CISO>

CRITICAL GAPS (resolve within 30 days)
--------------------------------------
Gap ID    | Description | Owner | Target Date | Status
GAP-001   | No MFA on admin accounts | IT Sec | 2026-07-01 | In Progress
GAP-002   | No formal risk assessment | GRC | 2026-07-15 | Not Started

HIGH GAPS (resolve within 60 days)
------------------------------------
GAP-003   | Incomplete patching process for critical CVEs | IT Ops | 2026-07-30 | Not Started

MEDIUM GAPS (resolve within 90 days)
--------------------------------------
GAP-004   | Vendor risk assessments not current | Procurement | 2026-08-31 | Not Started

LOW GAPS (resolve within 180 days)
------------------------------------
GAP-005   | Security training not tracked per user | HR | 2026-11-30 | Not Started
```

---

## 3. Effort Estimation Methodology

### T-Shirt Sizing
| Size | Effort | Example |
|------|--------|---------|
| XS | < 1 day | Screenshot a configuration, update a policy date |
| S | 1-5 days | Write a procedure, configure a monitoring rule |
| M | 1-4 weeks | Implement MFA for a system group, deploy SIEM integration |
| L | 1-3 months | Full PAM deployment, DLP implementation |
| XL | 3-12 months | Complete ISMS implementation, network segmentation |

---

## 4. RACI for Remediation

| Gap | Responsible | Accountable | Consulted | Informed |
|-----|-------------|-------------|-----------|---------|
| MFA rollout | IT Security | CISO | IT Ops | All staff |
| Risk assessment | GRC Analyst | CISO | Business Units | Board |
| Patch management | IT Operations | CTO | Security | CISO |
| Policy update | GRC Analyst | CISO | Legal, HR | All staff |
| Vendor assessments | Procurement | CPO | Legal, Security | CISO |

---

## 5. Exception Management Process

For gaps that cannot be remediated within standard SLAs:

```
RISK ACCEPTANCE / EXCEPTION REQUEST
=====================================
Gap ID:             <GAP-001>
Requestor:          <Name, Role>
Date Requested:     <YYYY-MM-DD>
Standard Violated:  <PCI-DSS Req 8.4.1>
Description of Gap: <MFA cannot be enabled on legacy SCADA system>
Business Justification: <System cannot be upgraded; vendor EOL>
Compensating Controls:
  1. <Network isolation to dedicated VLAN>
  2. <Jump server with MFA required>
  3. <Session recording>
Residual Risk Rating: MEDIUM
Risk Owner:         <CISO>
Approval:           <CISO signature + Board approval for Critical>
Exception Period:   <12 months, reviewed annually>
Review Date:        <YYYY-MM-DD>
Expiry Date:        <YYYY-MM-DD>
```

---

## 6. Progress Tracking Dashboard

### Metrics to Track
```
Total Gaps Identified:         <n>
  By Severity: Critical=<n>, High=<n>, Medium=<n>, Low=<n>
  By Standard: PCI=<n>, SOC2=<n>, ISO=<n>

Remediation Progress:
  Resolved:           <n> (<n>%)
  In Progress:        <n> (<n>%)
  Overdue:            <n> (<n>%)
  Accepted (Risk):    <n> (<n>%)
  Not Started:        <n> (<n>%)

Trend: vs prior month
  New gaps added:     <n>
  Gaps closed:        <n>
  Net change:         <+n / -n>

Overdue Critical/High Gaps: <list with owners>
```

---

## 7. Audit Readiness Checklist

90 days before audit:
- [ ] All Critical and High gaps resolved or accepted
- [ ] Risk acceptance documentation approved
- [ ] Evidence collection process confirmed
- [ ] Policy and procedure documents updated and approved
- [ ] Auditor scope letter agreed

30 days before audit:
- [ ] Evidence package assembled and indexed
- [ ] Evidence integrity hashes generated
- [ ] Control owners briefed and available for auditor inquiry
- [ ] Outstanding Medium gaps have documented remediation plan

Audit kickoff:
- [ ] Scope confirmed with auditor
- [ ] Evidence portal/SharePoint access granted to auditor
- [ ] Named primary and backup contacts designated
- [ ] Daily standup schedule agreed for audit fieldwork period
