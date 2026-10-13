# Risk Assessment

## Purpose
Score identified risks using qualitative and quantitative methods, calibrate against risk appetite, and prioritise for treatment.

---

## 1. Qualitative Scoring

### Likelihood Scale
| Score | Label | Criteria |
|-------|-------|---------|
| 1 | Rare | < once in 5 years; no known exploits; nation-state effort required |
| 2 | Unlikely | Once in 2-5 years; limited attack complexity; few known threat actors |
| 3 | Possible | Once per 1-2 years; known CVEs exist; commodity tools available |
| 4 | Likely | Once per year; actively exploited in wild; easy to execute |
| 5 | Almost Certain | Multiple times per year; trivial to exploit; automated exploitation |

### Impact Scale
| Score | Label | Criteria |
|-------|-------|---------|
| 1 | Negligible | Minimal disruption; no regulatory impact; < $10k financial impact |
| 2 | Minor | Limited disruption; internal only; $10k-$100k |
| 3 | Moderate | Customer-facing impact; possible regulatory notification; $100k-$1M |
| 4 | Major | Significant breach; regulatory fine likely; $1M-$10M; media coverage |
| 5 | Catastrophic | Business-threatening; regulatory action; > $10M; existential reputational damage |

### Risk Matrix
```
         Impact
         1    2    3    4    5
L     5 [5]  [10] [15] [20] [25]
i     4 [4]  [8]  [12] [16] [20]
k     3 [3]  [6]  [9]  [12] [15]
e     2 [2]  [4]  [6]  [8]  [10]
h     1 [1]  [2]  [3]  [4]  [5]
o
o  Risk score = Likelihood × Impact
d  
   Critical = 20-25
   High     = 12-19
   Medium   = 6-11
   Low      = 1-5
```

---

## 2. Inherent vs Residual Risk

```
Inherent Risk  = Risk BEFORE any controls are applied
                 (assess as if no controls exist)

Residual Risk  = Risk AFTER existing controls are considered
                 (assess current state with controls in place)

Example:
  Scenario: Ransomware attack on backup systems
  Inherent: Likelihood=4, Impact=5 → Score=20 (Critical)
  Controls in place: Immutable backups, offline copies, tested recovery
  Residual: Likelihood=2, Impact=3 → Score=6 (Medium)
  
  Document: what controls justify the likelihood/impact reduction
```

---

## 3. Risk Appetite and Tolerance

### Appetite vs Tolerance
```
Risk Appetite: Amount of risk the organisation is WILLING to accept
               (strategic, board-approved statement)
               Example: "We accept Medium operational risks as cost of doing business.
                         We do NOT accept any Critical risks without treatment plan."

Risk Tolerance: Acceptable variation around risk appetite
                (specific thresholds per risk category)

Risk Capacity:  Maximum risk the organisation CAN bear
                (financial, operational, reputational limits)
```

### Risk Appetite Statement by Category
| Risk Category | Appetite | Tolerance Threshold |
|--------------|---------|-------------------|
| Regulatory/Legal | Zero tolerance | No violations acceptable |
| Customer data breach | Very Low | < 1 incident per 3 years |
| Operational disruption | Low | < 4 hours downtime for critical systems |
| Financial fraud | Low | < 0.1% of annual revenue |
| Third-party incident | Medium | < 2 per year with < $100k impact each |

---

## 4. FAIR Model for Financial Quantification

### FAIR Components
```
Risk = Loss Event Frequency × Loss Magnitude

Loss Event Frequency (LEF):
  LEF = Contact Frequency × Probability of Action
  
  Contact Frequency: How often does the threat actor encounter the asset?
  Probability of Action: Given contact, what's the probability of attack?

Loss Magnitude (LM):
  Primary Loss: Direct financial impact (recovery costs, lost revenue)
  Secondary Loss: Indirect (regulatory fines, reputation, legal liability)

Vulnerability: Probability that a threat succeeds given a threat event occurs
  Vulnerability = f(Threat Capability, Control Strength)
```

### FAIR Analysis Example
```
Scenario: Ransomware attack on core ERP system

Contact Frequency: 12 times per year (opportunistic scanning)
Probability of Action: 30% (attacker attempts if contact made)
Threat Event Frequency: 12 × 0.30 = 3.6 events/year

Vulnerability:
  Threat Capability: High (ransomware-as-a-service, low skill threshold)
  Control Strength: Medium (MFA deployed but unpatched vuln present)
  Vulnerability: 60%

Loss Event Frequency: 3.6 × 0.60 = 2.16 events/year

Loss Magnitude (per event):
  Primary: $500k (recovery, downtime, IT labour)
  Secondary: $200k (regulatory notification, customer notification, brand)
  Total LM: $700k

Annualised Loss Expectancy (ALE): 2.16 × $700k = $1,512,000/year

Decision: Investment up to $1.5M/year in controls is financially justified.
```

---

## 5. Risk Aggregation

For portfolio-level risk view:
```
1. Group risks by risk category (cyber, operational, strategic, legal)
2. Sum residual risk scores per category
3. Identify concentration risk (many risks from single threat actor/vendor)
4. Identify correlated risks (ransomware hitting both primary and backup simultaneously)
5. Produce aggregate risk view for board

Correlation warning signs:
  - Multiple critical assets on same network segment
  - Multiple critical vendors using same data centre
  - Multiple controls dependent on same underlying technology
```
