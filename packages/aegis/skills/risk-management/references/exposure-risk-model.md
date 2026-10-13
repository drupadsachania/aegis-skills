# Exposure Risk Model — Reference

Use this phase to score exposure risk deterministically, tie it to business context, and
express risk reduction as a proven before/after delta rather than an assertion. This
model is what `exposure-validation` consumes for prioritisation and what remediation
verification uses to prove the programme reduced risk.

## 1. Reasoning Explains the Score; Logic Assigns It

A judgement call — human or AI — may gather inputs, correlate them and *explain* a risk
score in plain language. The authoritative score itself comes from an explicit,
deterministic function of evidenced inputs. This keeps scores reproducible, auditable and
immune to a fluent-but-thin argument inflating a number.

```
inputs (each evidenced)  →  deterministic risk function  →  authoritative score + state
                                        │
                        reasoning layer explains the result, never overrides it
```

## 2. A Pluggable Risk Function

Do not hard-code one formula as truth. Define a risk model as a replaceable function so a
better-calibrated model can be swapped in without rewriting everything that depends on it:

```
RiskModel.evaluate(context) → RiskAssessment
```

A reasonable starting model combines evidenced factors; calibrate the weights to your
environment rather than treating any single formula as canonical:

| Factor | From | Captures |
|--------|------|----------|
| Threat likelihood | `threat-intel-synthesis` (KEV, EPSS, observed use) | How likely is exploitation at all? |
| Exposure | `exposure-validation` exposure state | Does it apply and is it reachable? |
| Exploitability | `exposure-validation` exploitability state | Was it proven exploitable here? |
| Business criticality | §3 business-context chain | Does the affected asset matter? |
| Attack-path impact | `exposure-validation` impact-and-attack-paths | What does it reach? |
| Control weakness | `endpoint-security` / `security-operations` validation | Did controls catch it? |

```
Risk ≈ f(ThreatLikelihood, Exposure, Exploitability,
         BusinessCriticality, AttackPathImpact, ControlWeakness)
```

**Each factor must be evidenced, not assumed.** An `exploitability` of "confirmed"
without a proof reference, or a "crown-jewel-reachable" impact built on unverified edges,
makes the whole score untrustworthy however precise it looks.

## 3. Business-Context Chain

Risk is meaningless without knowing what matters. Maintain the mapping from technical
asset to business value — this is owned here and consumed by exposure impact analysis:

```
Asset ──► Application ──► Business Service ──► Business Capability ──► Criticality
```

Crown jewels are named *with business owners*: revenue-critical systems, regulated data
stores, identity infrastructure, backups, safety-critical OT. A technically severe
exposure on a disposable system ranks below a moderate one on the payment path — and only
the business draws that line, not the scanner and not the security team alone.

## 4. Inherent → Residual, With Evidence

The existing qualitative model (inherent vs residual risk, appetite, tolerance) still
frames governance. The exposure-risk model adds that the step from inherent to residual
is backed by *validated* controls, not assumed ones:

| | Assumed-control residual | Validated-control residual |
|-|--------------------------|----------------------------|
| Basis | "We have EDR, so credential theft is mitigated" | "T1003 was BLOCKED in testing on this fleet, 2026-10" |
| Trust | Hope | Evidence |

A control that has not been validated (see the detection and control-effectiveness
phases) reduces *inherent* risk on paper but should not be credited in *residual* risk
until its effectiveness is evidenced.

## 5. Risk Before, After, Delta

The model keeps three values per exposure so the programme can prove reduction:

```
risk_before   at confirmation — exploitable, uncontrolled
risk_after     after remediation + verification (exploit no longer succeeds / path cut)
risk_delta     the proven reduction
```

`risk_delta` is only credible when `risk_after` rests on a passed retest (see
`exposure-validation` remediation-verification), not on a closed ticket. Aggregated
across cases, the delta is the programme's headline outcome:

> "Exploitable exposure to crown jewels fell X% this quarter — each reduction backed by
> before/after proof."

## 6. Confidence Travels With the Score

A risk score carries the confidence of its weakest evidenced input. A high score built on
a low-confidence exploitability claim is itself low-confidence, and should be reported
that way — flagged for corroboration, not presented to leadership as settled. When a key
input is `UNKNOWN`, the risk is `UNKNOWN` for that dimension; do not substitute a
default that reads as reassurance.

## 7. Executive Reporting — Outcomes, Not Counts

Report validated exposure, business impact, remediation velocity and proven risk
reduction — not raw CVE counts. Every executive statement traces to evidence:

| Instead of | Report |
|-----------|--------|
| "14,000 vulnerabilities" | "23 exposures confirmed exploitable to crown jewels; 18 verified closed" |
| "Average CVSS 8.1" | "Exploitable exposure to the payment platform reduced 64%, verified" |
| "95% patched" | "Mean time from KEV publication to evidenced exposure answer: 2.5 hours" |

## ATT&CK Mapping
This phase is risk quantification rather than technique-bearing; it weights the
techniques proven by `exposure-validation` cases according to business context and
validated control strength.
