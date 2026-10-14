# Risk Register

## Purpose
Design and govern a structured risk register as the authoritative source of risk information for the organisation.

---

## 1. Risk Register Schema

### Required Fields per Risk Entry
```
Core Identification:
  Risk ID:           RISK-<YYYY>-<nnn>
  Title:             <Concise risk name>
  Description:       <Detailed description of the risk scenario>
  Date Identified:   <YYYY-MM-DD>
  Date Last Updated: <YYYY-MM-DD>
  Status:            Active / In Treatment / Accepted / Closed

Business Context:
  Asset/Process:     <Critical asset or business process at risk>
  Business Impact:   <Revenue / Regulatory / Operational / Reputational>
  Threat Actor:      <Internal / External / Nation-State / Insider>
  Threat Event:      <What could happen: ransomware, data theft, outage>

Risk Assessment:
  Existing Controls: <list existing controls addressing this risk>
  Inherent Risk:     Likelihood (1-5) × Impact (1-5) = <score>
  Residual Risk:     Likelihood (1-5) × Impact (1-5) = <score>
  Risk Rating:       Critical / High / Medium / Low

Treatment:
  Treatment Decision: Accept / Mitigate / Transfer / Avoid
  Treatment Actions:  <control references>
  Risk Owner:         <named individual>
  Due Date:           <YYYY-MM-DD>
  Progress:           <% complete or status>

Governance:
  Review Date:       <YYYY-MM-DD>
  Next Review:       <YYYY-MM-DD>
  Escalation Status: <Board notified Y/N>
  Exceptions:        <any accepted deviations>
```

---

## 2. Risk Register Governance

### Quarterly Review Cycle
```
Month 1 (review month):
  Week 1: Risk owners update their risks (progress, new information)
  Week 2: GRC team aggregates and prepares risk report
  Week 3: Security Steering Committee reviews and approves
  Week 4: Board risk committee receives top 10 risk update

Criteria for interim (outside quarterly) review:
  - Material security incident that activates a risk
  - Significant change in threat landscape (new zero-day, nation-state activity)
  - Major business change (acquisition, new product, market entry)
  - Regulatory change affecting risk profile
  - Vendor breach affecting supply chain
```

### Escalation Thresholds
| Condition | Escalation |
|-----------|-----------|
| New Critical risk | CISO notification within 24h; Board at next meeting |
| Residual risk remains Critical after treatment | Board approval for acceptance |
| Risk score increased by 2+ levels | Risk Owner + CISO review within 1 week |
| Risk owner departure | Immediate re-assignment required |
| Treatment overdue by > 30 days | CISO notification; leadership escalation |

---

## 3. GRC Platform Integration

### Common GRC Tools and Risk Register Features
| Tool | Key Features |
|------|-------------|
| ServiceNow GRC | Workflow automation, control inheritance, audit trail |
| Archer | Flexible schema, quantitative risk, regulatory mapping |
| LogicGate | Visual risk workflow, scoring models, reporting |
| OneTrust | Privacy-focused, regulatory mapping, vendor risk |
| Vanta | SOC 2 / ISO 27001 automation, continuous monitoring |
| Spreadsheet (fallback) | Excel/Google Sheets with defined schema and access controls |

### Minimum Spreadsheet Requirements
```
- Access restricted (not widely shared)
- Version control (dated save copies)
- Change log tab (who changed what and when)
- Hash/checksum of file (integrity)
- Read-only copy exported for audit
```

---

## 4. Risk Register Maintenance

### New Risk Entry Triggers
- Vulnerability scanner finding with CVSS > 9.0 (Critical)
- Penetration test finding (always add to register)
- Security incident (severity Medium or above)
- Threat intelligence advisory naming organisation's sector/technology
- Compliance gap identified in audit
- Business change (new system, new market, new third party)

### Risk Closure Criteria
- Treatment fully implemented and verified
- Risk appetite met (residual risk within tolerance)
- Formal closure sign-off by risk owner and CISO
- Evidence of control effectiveness documented
- Note: Never delete closed risks; mark as Closed with closure date

---

## 5. Sample Risk Register (Abbreviated)

| Risk ID | Title | Inherent | Residual | Treatment | Owner | Due | Status |
|---------|-------|---------|---------|-----------|-------|-----|--------|
| RISK-2026-001 | Ransomware on ERP | C (20) | M (8) | Mitigate | VP Tech | 2026-09-01 | In Progress |
| RISK-2026-002 | Supply chain compromise | H (15) | M (9) | Mitigate+Transfer | CISO | 2026-12-01 | In Progress |
| RISK-2026-003 | Insider data exfiltration | H (12) | M (6) | Mitigate | HR+IT | 2026-08-01 | In Progress |
| RISK-2026-004 | PCI-DSS non-compliance | H (16) | L (4) | Mitigate | Compliance | 2026-07-01 | Complete |
| RISK-2026-005 | Legacy system (EOL) | M (9) | M (9) | Accept | CTO | — | Accepted |
