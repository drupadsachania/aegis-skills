# Attack Pattern Extraction — Reference

Use during Phase 2 to convert individual incidents into **reusable patterns**. One breach
is an anecdote; the pattern behind twenty breaches is what you actually defend against.

## 1. Incident → Pattern

An incident is specific (this victim, this CVE, this week). A pattern is the transferable
abstraction. Extract by stripping the particulars and keeping the mechanism.

| Incident (specific) | Pattern (reusable) |
|--------------------|--------------------|
| CVE-2026-19478 GraphQL flaw deletes GitLab projects | Unauthenticated API mutation on a self-managed dev platform → destructive data loss (T1190 → T1485) |
| Crafted GitHub issue title injects into CI shell block, leaks Jira creds | Untrusted input reaching a CI `run:` block → secret disclosure (T1195.002 → T1552.004) |
| SOHO router DNS hijack → AiTM theft of M365 tokens | Edge-device compromise → DNS control → session-token theft bypassing MFA (T1584.005 → T1557 → T1550.004) |
| Internet-facing PLCs at water utilities | Unauthenticated ICS protocol reachable from internet → process manipulation (T0886 → T0855) |

**Test for a real pattern:** could it recur with a different vendor, CVE, and victim?
If no, it is still an incident.

## 2. Technique Mapping Discipline

Map to the **whole chain**, not a single technique. A finding with one technique ID is
almost always under-mapped.

```
For each pattern, fill the chain that applies:
  Initial Access    → how they got in
  Execution         → what ran
  Persistence       → how they stayed
  Priv Escalation   → how they gained rights
  Defense Evasion   → what they hid from
  Credential Access → what they stole
  Discovery/Lateral → how they moved
  Collection        → what they gathered
  C2 / Exfiltration → how it left
  Impact            → the damage
```

Choose the framework by system type: **ATT&CK Enterprise** (IT), **ATT&CK for ICS**
(T0xxx, OT/process), **ATLAS** (AML.Txxxx, ML/AI systems). A converged incident may need
two — an IT foothold (T1190) leading to ICS impact (T0855).

### Mapping Rules
- Map to the **most specific** sub-technique the evidence supports, and no further.
  `T1059` when the reporting says "ran a script"; `T1059.001` only if it names PowerShell.
- Do not infer techniques the source never described. Under-mapping is recoverable;
  fabricated mappings poison every downstream coverage calculation.
- Record mapping confidence alongside the ID.

## 3. Pattern Clustering

Group patterns to find the structural themes worth investing in:

```
Cluster by:
  Entry vector     — edge device / phishing / supply chain / valid accounts / exposed service
  Target surface   — identity / network / endpoint / cloud / OT / ML / data
  Objective        — ransomware / espionage / data theft / fraud / disruption / hacktivism
  Novelty          — new technique | new application of old technique | pure repetition

The highest-value cluster is almost always:
  "old technique, still working, because the detection debt was never paid"
That is where your effort converts to risk reduction — not the novel zero-day.
```

## 4. Recurrence and Trend Signals

Knowledge-graph node/link metadata (`count`, `first_seen`, `last_seen`) is the trend
engine. Read it as follows:

| Signal | Meaning | Response |
|--------|---------|----------|
| Node `count` rising week-over-week | Technique/actor/org gaining prominence | Prioritise coverage review |
| New node appearing, high initial count | Emergent threat or newly disclosed class | Rapid assessment — is it in scope? |
| Rising edge weight `actor → cve` | Active exploitation campaign | Check exposure to that CVE now |
| Rising edge weight `cve → org` | Vendor under sustained pressure | Review all products from that vendor |
| `last_seen` going stale | Threat receding or reporting fatigue | Age out; do not delete history |
| Same pattern, new victims, no new technique | Detection debt, not adversary innovation | Fix the control gap |

## 5. Novelty Assessment (avoid hype-driven prioritisation)

```
Is the technique genuinely new?
├── New primitive never seen before                     → rare; deep analysis warranted
├── New application of a known technique                → update existing detection
├── New tooling that commoditizes a known technique     → HIGH priority: skill floor
│   dropped, expect volume increase (e.g. Certipy, ForgeCert for AD CS abuse)
└── Pure repetition of a documented technique           → coverage question, not research

Commoditization is the most under-rated signal. When a technique becomes one command in
a public tool, "advanced" stops being a useful label and prevalence jumps.
```

## 6. Pattern Record Template

| Field | Example |
|-------|---------|
| Pattern name | CI workflow injection via untrusted issue metadata |
| Chain | T1195.002 → T1059 → T1552.004 → T1567 |
| Entry vector | Supply chain / CI |
| Target surface | Application security, DevOps |
| Objective | Credential theft |
| Novelty | Known technique, recurring — detection debt |
| Prevalence | Rising (3 incidents in 6 weeks) |
| Confidence | High (Tier B vendor research with PoC detail) |
| Provenance | Wiz research, 2026-08-18 |

## ATT&CK Coverage
T1190 T1195 T1195.002 T1199 T1078 T1133 T1566 T1059 T1552 T1552.004 T1557 T1550
T1550.004 T1584 T1584.005 T1485 T1486 T1567 T1041 · ICS: T0855 T0886 T0843 · ATLAS: AML.T0020 AML.T0040
