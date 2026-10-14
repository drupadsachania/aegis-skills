# Deception Placement Matrix

The semantic decision engine for Phase 3. Cross-reference your Attack Surface Score
(from Phase 1) with your Signal Validity rating (from Phase 2) to derive a deception
posture for each zone. Every cell produces a specific, justified recommendation — not a generic one.

---

## The Core Matrix

Attack Surface Score (AS) is the sum from Phase 1 taxonomy (3-9 scale).
Signal Validity (SV) is the aggregate rating from Phase 2 scorecard (High / Medium / Low).

```
                        SIGNAL VALIDITY
                   High          Medium         Low
               ┌─────────────┬─────────────┬─────────────┐
  AS: 7-9      │  POSTURE A  │  POSTURE B  │  POSTURE C  │
  (High)       │  Active     │  Active +   │  Token-     │
               │  Honeypot   │  Dense      │  Dominant   │
               │  + Tokens   │  Tokens     │  Grid       │
               ├─────────────┼─────────────┼─────────────┤
  AS: 4-6      │  POSTURE D  │  POSTURE E  │  POSTURE F  │
  (Medium)     │  Sparse     │  Token      │  Fix Signal │
               │  Breadcrumb │  Layer Only │  First      │
               │  + Tokens   │             │             │
               ├─────────────┼─────────────┼─────────────┤
  AS: 3        │  POSTURE G  │  POSTURE H  │  POSTURE I  │
  (Low)        │  Breadcrumb │  Skip       │  Skip       │
               │  Only       │             │             │
               └─────────────┴─────────────┴─────────────┘
```

---

## Posture Definitions

### POSTURE A — Active Honeypot + Tokens (High AS / High SV)
**Zone profile:** Crown jewel zone, well-instrumented, attacker would highly value this zone.
**Logic:** Your signals are good, so a honeypot interaction will be captured with full fidelity.
Deploy interactive honeypots AND embed honeytokens in adjacent real assets to catch
the attacker before they reach the honeypot.

**Deploy:**
- 1 high-interaction honeypot per segment (SSH, SMB, HTTP, or protocol-appropriate)
- Cowrie-class for credential capture and session recording
- Honeytokens on every adjacent real asset pointing toward the honeypot
- Breadcrumb trail from likely initial access zones inward

**Signal routing:** Route honeypot session logs to SIEM for full behavioural analysis.
Route honeytoken hits as CRITICAL P0, bypassing standard analyst queue.

---

### POSTURE B — Active Honeypot + Dense Tokens (High AS / Medium SV)
**Zone profile:** High-value zone, moderate instrumentation, some noise in existing signals.
**Logic:** Zone is valuable enough to warrant active honeypots, but signal fidelity means
deception hits might be confused with noisy legitimate alerts. Dense token deployment
ensures high probability of a hit before the attacker reaches real assets.

**Deploy:**
- 1 low-to-medium-interaction honeypot per segment
- High-density honeytokens (3-5 per asset class in this zone)
- Ensure honeytoken alerts are tagged distinctly from existing noisy alerts
- Out-of-band callback (DNS/webhook) as primary alert, SIEM as secondary

**Signal routing:** Primary via out-of-band callback (latency guaranteed). SIEM as enrichment source.

---

### POSTURE C — Token-Dominant Grid (High AS / Low SV)
**Zone profile:** High-value zone, poor visibility, attacker would prize this zone.
**Logic:** You cannot trust your existing signals to catch activity in this zone.
Active honeypots still generate value, but their logs may not reach SIEM reliably.
Honeytokens are the primary detection mechanism because they fire independently of SIEM.

**Deploy:**
- Honeytokens ONLY as primary detection layer (self-signalling, out-of-band)
- Optional: low-interaction honeypot with direct webhook alerting (no SIEM dependency)
- Immediate parallel workstream: fix signal coverage in this zone
- Document this zone as highest-priority detection gap

**Signal routing:** Exclusively out-of-band (DNS callback, AWS CloudTrail direct, webhook).
Do not depend on SIEM for primary alert — it may not arrive in time or at all.

**Parallel action required:** Brief CISO that this zone has high exposure + low visibility.
Deception is compensating, not solving, the underlying signal gap.

---

### POSTURE D — Sparse Breadcrumb + Tokens (Medium AS / High SV)
**Zone profile:** Moderate value zone with good instrumentation.
**Logic:** Your existing signals are good, so you will likely catch an attacker here through
normal detection. Deception adds a guaranteed-signal backstop without over-engineering.

**Deploy:**
- Breadcrumbs on real assets pointing toward higher-value deception zones (Posture A/B)
- 1-2 honeytokens per asset class (not high density — signals are already good)
- No standalone honeypots unless budget/resources allow

**Signal routing:** Route through standard SIEM pipeline — signal fidelity is high enough
that deception hits will be actionable. Tag with `deception: true` for routing priority.

---

### POSTURE E — Token Layer Only (Medium AS / Medium SV)
**Zone profile:** Moderate value zone, moderate visibility.
**Logic:** Not worth deploying full honeypot infrastructure here. Honeytokens are the
cost-effective choice — they add precision signal without operational overhead.

**Deploy:**
- 1-2 honeytokens per asset class
- Focus token type on the most likely attacker behaviour in this zone
  (credential files for endpoints, IAM keys for cloud, service accounts for identity)
- No interactive honeypots

**Signal routing:** SIEM with deception tag. Out-of-band as backup for latency safety.

---

### POSTURE F — Fix Signals First (Medium AS / Low SV)
**Zone profile:** Moderate value zone, poor visibility.
**Logic:** Deploying deception into a zone where you cannot see the interaction is waste.
If an attacker triggers a honeytoken in a blind zone and the alert takes 24 hours to arrive,
the attacker has already pivoted. Address the signal gap before spending on deception.

**Deploy:** Nothing — yet.
**Action required:** Identify which source covers this zone and why it has low validity.
Is it a coverage gap (no agent/parser)? Fidelity gap (too much noise)? Latency gap (batch)?
Fix the root cause. Reassess zone in 30-60 days and re-run Phase 2.

**Exception:** If the zone is adjacent to a crown jewel and cannot wait for signal remediation,
deploy Posture C (token-dominant, out-of-band only) as a temporary measure with explicit
documentation that signal remediation is the parallel priority.

---

### POSTURE G — Breadcrumb Only (Low AS / High SV)
**Zone profile:** Supporting zone, well-instrumented.
**Logic:** Not worth active deception investment, but breadcrumbs here redirect attackers
toward your monitored deception zones. Leverage good signal validity for redirection.

**Deploy:**
- Breadcrumbs only — fake config entries, fake bookmarks, fake host file entries
  pointing toward zones with active deception (Posture A/B)
- Cost: near-zero. Value: funnels attacker into your monitored zones

---

### POSTURE H — Skip (Medium AS / Low SV)
**Action:** Do not deploy deception here. Fix signals first. See Posture F reasoning.

---

### POSTURE I — Skip (Low AS / Low SV)
**Action:** Neither the attack surface nor the signal quality justifies deception investment.
Document and revisit if environment changes.

---

## Deception Type Quick-Reference by Attacker Behaviour

When you know the likely adversary TTP (from Phase 0), choose the deception type
that intercepts that specific behaviour:

| Adversary Behaviour (ATT&CK) | Deception Type | Specific Asset |
|------------------------------|----------------|----------------|
| Credential enumeration (T1552) | Honeytoken | Fake .env, fake .aws/credentials |
| Kerberoasting (T1558.003) | AD Honeytoken | Service account with SPN, never authenticates |
| Network service scanning (T1046) | Honeypot | Port-responsive service on non-standard internal IP |
| SMB lateral movement (T1021.002) | Honeytoken + Honeypot | Fake share in net use, SMB honeypot server |
| Password manager access (T1555) | Honeytoken | Fake entry in KeePass/1Password vault |
| Cloud credential theft (T1552.005) | Honeytoken | Fake IAM key in code, monitored via CloudTrail |
| Data exfiltration staging (T1039) | Honeytoken | Fake high-value document with callback on open |
| IT-to-OT pivot (T0886) | Breadcrumb + Passive Honeypot | Fake jump host entry pointing to monitored endpoint |
| Supply chain enumeration | Honeytoken | Fake partner portal credential embedded in supplier-facing config |
| BloodHound / AD enumeration (T1087) | AD Honeytoken | Fake admin accounts that appear in BloodHound paths |

---

## Believability Engineering Checklist

A deception asset that an attacker identifies as fake provides no intelligence and
may cause them to sanitise their behaviour. Before finalising any asset:

**Naming and metadata:**
- [ ] Asset name follows the environment's actual naming convention
- [ ] Creation date is historically plausible (not today's date)
- [ ] Owner / description field is filled and realistic
- [ ] Asset appears in the right organisational unit / directory / group

**Technical plausibility:**
- [ ] Fake service responds to basic probes (ping, port scan, banner grab)
- [ ] Fake credential follows the real credential format (correct prefix length, structure)
- [ ] Fake file has realistic content structure (not empty, not placeholder text)
- [ ] Fake AD account has last password set date, last login date (both plausible, not zero)

**Placement plausibility:**
- [ ] Asset is in a location a legitimate user would plausibly have placed it
- [ ] Asset co-exists with real assets of the same type (not isolated)
- [ ] Asset is not in a path that legitimate automation regularly touches

**Red team verification (post-deployment):**
- [ ] Brief red team on zone (not specific asset) and have them enumerate naturally
- [ ] If they find and interact with the asset: believability confirmed
- [ ] If they find and skip it: believability failure — investigate why
- [ ] If they do not find it: placement review — is it in the right path?
