# Third-Party Governance

## Purpose
Design and operate a risk-based Third-Party Risk Management (TPRM) programme covering the full vendor lifecycle.

---

## 1. TPRM Lifecycle Phases

| Phase | Description | Key Activities |
|-------|-------------|---------------|
| Pre-engagement | Due diligence before contracting | Initial risk assessment, security questionnaire |
| Contracting | Security requirements in contract | Data handling clauses, breach notification, right to audit |
| Onboarding | Technical and process integration | Access provisioning, integration security review |
| Ongoing monitoring | Continuous and periodic oversight | Annual reassessment, news monitoring, performance review |
| Off-boarding | Secure termination | Access revocation, data return/destruction, final review |

---

## 2. Vendor Risk Tiering

### Tiering Criteria
| Factor | Weight | Assessment |
|--------|--------|-----------|
| Data access (type and volume of data) | 40% | None / Low / Medium / High sensitivity |
| Business criticality | 35% | Non-critical / Operational / Critical / Mission-critical |
| Integration depth | 25% | None / API / Network integration / Direct system access |

### Risk Tier Definitions
| Tier | Score | Description | Examples |
|------|-------|-------------|---------|
| Critical | 8-10 | Processes restricted data; mission-critical service | Cloud CSP, payment processor, HR SaaS |
| High | 6-7 | Processes confidential data; important operational service | Pen test firm, audit firm, SIEM vendor |
| Medium | 4-5 | Limited data access; operational but not critical | Software tool vendors, training platforms |
| Low | 1-3 | No sensitive data; non-critical | Office supplies, catering, facilities |

---

## 3. Tiered Assessment Approach

### Critical Tier
```
Pre-engagement:
  - Full security questionnaire (CAIQ, SIG, or custom)
  - Evidence review: SOC 2 Type II, ISO 27001 certificate, pen test summary
  - On-site assessment or virtual equivalent
  - Legal/Procurement/Security sign-off required

Ongoing:
  - Annual full reassessment
  - Continuous monitoring (SecurityScorecard, BitSight, RiskRecon)
  - Real-time incident notification SLA: 2 hours
  - Quarterly business reviews (include security agenda item)
```

### High Tier
```
Pre-engagement:
  - Security questionnaire
  - Evidence review: SOC 2 or ISO cert
  - Security approval required

Ongoing:
  - Annual reassessment
  - Review of material changes (M&A, major breaches)
  - Incident notification SLA: 24 hours
```

### Medium Tier
```
Pre-engagement:
  - Abbreviated questionnaire (10-15 questions)
  - Review self-assessment

Ongoing:
  - Biennial reassessment
  - Incident notification SLA: 72 hours
```

### Low Tier
```
Pre-engagement:
  - Standard contractual requirements only
  - No assessment required

Ongoing:
  - No active monitoring
  - Contract renewal review
```

---

## 4. Contract Security Requirements

### Mandatory Clauses (all tiers)
```
Data Handling and Processing:
  - Definition of permitted uses of company data
  - Prohibition on sub-processing without approval
  - Data residency requirements (geography)
  - Data deletion on termination (specify format, timeline, certification)

Breach Notification:
  Critical/High: 2 hours for suspected breach, 24 hours for confirmed
  Medium:        24 hours for confirmed breach
  All:           Assist with investigation; provide logs on request

Security Standards:
  Requirement to maintain ISO 27001 or equivalent (or SOC 2)
  Requirement to conduct annual penetration testing
  Patch critical vulnerabilities within defined SLA

Right to Audit:
  Right to conduct or commission security assessment with reasonable notice
  Right to review evidence of compliance with security requirements
  Subprocessor controls: vendor must flow down requirements to subs

Incident Cooperation:
  Provide reasonable assistance to forensic investigations
  Preserve logs for defined period
  Named security contact with 24/7 availability for Critical vendors
```

---

## 5. Continuous Monitoring Programme

### Technology-Based Monitoring (Critical/High vendors)
- **SecurityScorecard**: External attack surface; domain reputation; certificate issues
- **BitSight**: Similar to SecurityScorecard; industry benchmarking
- **RiskRecon**: Detailed findings on exposed vulnerabilities and misconfigurations

Triggers for immediate reassessment:
- Public breach or data exposure incident involving vendor
- Material change: M&A, major executive change, regulatory action
- SecurityScorecard/BitSight score drops by > 10 points
- Vendor loses key security certification (SOC 2 qualified opinion)

---

## 6. TPRM Programme Metrics

| Metric | Target |
|--------|--------|
| Vendor inventory coverage (all known vendors assessed) | 100% |
| Critical/High vendors with current assessment | > 95% |
| Overdue Critical vendor reassessments | 0 |
| Vendors without required security clause in contract | < 5% |
| Time to complete new vendor assessment (Critical) | < 15 days |
| Incident notification SLA compliance by vendors | 100% |
| SecurityScorecard average for Critical vendors | > 70/100 |
