# Attack Surface Coverage Mapping — Reference

Use during Phase 4 to convert extracted patterns into an honest map of **where you are
covered, partially covered, and blind**. This is the phase that makes intel actionable —
and the one most programmes skip, which is why they accumulate intel without reducing risk.

## 1. Coverage Area Model

An **attack surface coverage area** is a defensible slice of the estate with an owner, a
control set, and a detection set. Every extracted pattern must land in at least one.

| # | Coverage Area | Scope | Aegis Skill(s) |
|---|--------------|-------|----------------|
| 1 | External exposure | Internet-facing assets, edge devices, shadow IT | attack-surface-mapping |
| 2 | Application & API | Web apps, APIs, CI/CD, source, dependencies | application-security |
| 3 | Identity & access | Accounts, tokens, certificates, MFA, privilege | identity-access-management |
| 4 | Endpoint | Workstations, servers, EDR, execution control | endpoint-security |
| 5 | Network | Segmentation, egress, lateral movement, DNS | network-security |
| 6 | Cloud & infrastructure | IaaS/PaaS, IaC, containers, control plane | infrastructure-security |
| 7 | Data | Classification, DLP, exfiltration, storage | data-loss-prevention |
| 8 | OT / ICS | Purdue levels, protocols, safety systems | operational-technology |
| 9 | AI / ML | Models, training data, inference, ML supply chain | mitre-atlas |
| 10 | Supply chain | Vendors, packages, updates, third-party access | application-security, risk-management |
| 11 | Detection & response | Telemetry, rules, triage, IR readiness | security-operations, threat-hunting |
| 12 | Human & process | Phishing resistance, governance, training | governance, compliance |

## 2. Coverage Determination

For each pattern × coverage area, assign a state — and be ruthless about the difference
between "we have the product" and "we would actually catch it."

| State | Definition | Evidence Required |
|-------|-----------|-------------------|
| **Covered** | Control prevents it AND detection would catch it | Named control + named rule + validated |
| **Partial** | Control OR detection exists, not both; or exists but unvalidated | Named control, no test evidence |
| **Gap** | Neither prevention nor detection | — |
| **Blind** | Gap *and* the telemetry to detect it is not collected | Missing data source |

**Blind is the worst state and the easiest to miss** — a rule that was never fed is a
rule nobody notices is missing. Always check data availability before rule logic:

```
Before writing any detection, verify:
  1. Is the telemetry generated?     (e.g. CA issuance auditing is OFF by default)
  2. Is it collected and shipped?
  3. Is it retained long enough?     (dwell times exceed many retention windows)
  4. Is it parsed into usable fields?
If any answer is no, the gap is a DATA gap, not a rule gap — fix that first.
```

## 3. Coverage Matrix Template

| Pattern | Area | Prevention | Detection | State | Owner | Priority |
|---------|------|-----------|-----------|-------|-------|----------|
| Edge device RCE (T1190) | External exposure | KEV patch SLA 24h | Vuln scan + WAF alert | Partial | Infra | High |
| CI workflow injection (T1195.002) | Application | PR review, pinned actions | None | **Gap** | AppSec | High |
| Cert-based persistence (T1649) | Identity | Template hardening | CA audit 4886/4887 | **Blind** (auditing off) | IAM | Critical |
| Token theft via AiTM (T1550.004) | Identity | Conditional access | Impossible travel | Partial | IAM | High |
| Internet-facing PLC (T0886) | OT | Segmentation | Passive protocol monitor | Gap | OT | Critical |

## 4. Gap Prioritisation

Score each gap; do not work them in discovery order.

```
Gap Priority = (Prevalence × Impact × Exposure) / Effort

Prevalence — how often the pattern appears in current intel (KG count / trend)
Impact     — worst credible outcome (safety > data loss > disruption > nuisance)
Exposure   — do we actually have this surface? (a gap in tech you don't run is not a gap)
Effort     — cost to close (data gaps cost more than rule gaps but unblock many rules)

Bias toward:
  • gaps where TELEMETRY is missing (unblocks many future detections at once)
  • gaps on the EARLIEST chain step you can break
  • gaps in COMMODITIZED techniques (public tooling ⇒ volume is coming)
Bias against:
  • novel techniques with no tooling and no observed use against your sector
```

## 5. Honest Coverage Scoring

Per coverage area, report as a fraction with the denominator visible:

```
Area coverage = covered / (covered + partial + gap + blind)

Rules that keep the number honest:
  - Partial counts as 0.5, never 1
  - Blind counts as 0 AND is flagged separately (data debt)
  - Untested detections count as partial — a rule that has never fired on a
    known-true positive is a hypothesis, not a control
  - Validate by emulation (Atomic Red Team / purple team), not by inventory
```

Report coverage as a range with an explicit assumption, not a false-precision percentage.
"Identity ~60%, assuming CA auditing gets enabled; ~40% if it does not" is more useful
than "58.3%".

## 6. Feeding Coverage Back Into the Skill Library

Gaps identified here write into each skill's `self-learning.coverage-gaps` field in
`skill.json`, and the supporting observations land in that skill's auto-maintained
`references/live-threat-intel.md`. That closes the loop: intel → pattern → gap → the
skill that will be invoked next time someone works that surface.

## ATT&CK Coverage
Coverage mapping spans the full matrix; the areas above collectively address
Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion,
Credential Access, Discovery, Lateral Movement, Collection, C2, Exfiltration, Impact —
across Enterprise, ICS (T0xxx), and ATLAS (AML.Txxxx).
