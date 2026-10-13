# Program Maturity

## Purpose
Assess current security programme maturity against recognised frameworks, benchmark against industry peers, and define a roadmap to target maturity.

---

## 1. NIST CSF 2.0 Tier Assessment

### Tier Definitions
| Tier | Name | Description |
|------|------|-------------|
| 1 | Partial | Ad hoc, reactive; no formal programme; risk not consistently managed |
| 2 | Risk Informed | Risk practices exist but not organisation-wide; awareness but not policy-driven |
| 3 | Repeatable | Formally approved policy; organisational approach; regularly updated |
| 4 | Adaptive | Risk management is part of culture; adapts to threats in near-real-time |

### Assessment Per CSF Function
```
For each function (Govern, Identify, Protect, Detect, Respond, Recover):

Assessment questions:
  1. Are practices formalised in policy? [Y/N]
  2. Are practices applied consistently across the organisation? [Y/N]
  3. Are practices reviewed and updated regularly? [Y/N]
  4. Is there executive/board awareness and support? [Y/N]
  5. Does the organisation adapt based on threat intelligence? [Y/N]

Scoring:
  0-1 Y answers = Tier 1
  2-3 Y answers = Tier 2
  4 Y answers   = Tier 3
  5 Y answers   = Tier 4

Current tier per function:
  Govern:   <1/2/3/4>
  Identify: <1/2/3/4>
  Protect:  <1/2/3/4>
  Detect:   <1/2/3/4>
  Respond:  <1/2/3/4>
  Recover:  <1/2/3/4>
  
  Overall: <average or weighted score>
  Target:  <desired tier within 12/24 months>
```

---

## 2. CMMC Level Assessment (US DoD Contractors)

| Level | Requirements | Target Org |
|-------|-------------|-----------|
| Level 1 | 17 practices from FAR 52.204-21 | FCI-only contractors |
| Level 2 | 110 practices from NIST SP 800-171 | CUI contractors |
| Level 3 | 110 NIST + 24 additional NIST 800-172 practices | High-priority CUI |

Level 2 key practice domains:
- Access Control (AC): 22 practices
- Audit and Accountability (AU): 9 practices
- Configuration Management (CM): 9 practices
- Identification and Authentication (IA): 11 practices
- Incident Response (IR): 3 practices
- Maintenance (MA): 6 practices
- Media Protection (MP): 9 practices
- Personnel Security (PS): 2 practices
- Physical Protection (PE): 6 practices
- Risk Assessment (RA): 5 practices
- Security Assessment (CA): 4 practices
- System and Communications Protection (SC): 16 practices
- System and Information Integrity (SI): 7 practices

---

## 3. Security Steering Committee Charter

```
SECURITY STEERING COMMITTEE CHARTER
=====================================
Purpose: Provide executive oversight, direction, and governance for the
         information security programme.

Membership:
  Chair:          CISO
  Members:        CTO, CRO, General Counsel, CPO, Head of HR,
                  Business Unit Leads (rotating), Internal Audit

Meeting Cadence: Quarterly (monthly in high-risk periods)

Standing Agenda:
  1. Approval of action items from last meeting
  2. Security programme dashboard review (KPIs, KRIs)
  3. Risk register review (material changes)
  4. Policy exception approvals
  5. Incident and near-miss review
  6. Upcoming compliance obligations
  7. Investment priorities

Decision Rights:
  Approve/reject risk acceptance > Medium threshold
  Approve security programme investments > $<threshold>
  Approve policy exceptions for High/Critical risks
  Escalate Critical risks to Board

Quorum: CISO + any 3 members
```

---

## 4. Maturity Roadmap Template

```
SECURITY PROGRAMME MATURITY ROADMAP
=====================================
Assessment Date:    <YYYY-MM-DD>
Current Maturity:   NIST CSF Tier <n> overall
Target Maturity:    NIST CSF Tier <n> by <date>

12-Month Initiatives (Tier 1 to Tier 2):
  Q1: Formal risk assessment process; document asset inventory
  Q2: Core security policies approved; training programme launched
  Q3: Vulnerability management process; patch SLAs defined
  Q4: Security steering committee established; metrics dashboard live

24-Month Initiatives (Tier 2 to Tier 3):
  Q1-Q2: Threat intelligence integration; SIEM deployment
  Q3-Q4: Third-party risk programme; incident response exercises

Benchmark comparison:
  Industry sector average (NIST CSF tier): <n>
  Our current:                              Tier <n>
  Target:                                   Tier <n>
  
  (Source: CIS/SANS annual security survey for sector)
```
