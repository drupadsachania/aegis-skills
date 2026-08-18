# Continuous Learning Loop — Reference

Use during Phase 6 to run the recurring cadence that keeps the skill library aligned with
the live threat landscape. This is the operational phase — it turns one-off analysis into
a compounding knowledge base.

## 1. The Weekly Cycle

```
INGEST     → pull the week's corpus (articles, knowledge graph, attack breakdowns)
NORMALISE  → dedupe against prior weeks; assign source tiers            [Phase 1]
EXTRACT    → incidents → reusable patterns → ATT&CK chains              [Phase 2]
RECONSTRUCT→ deep-dive the 1-2 most instructive incidents               [Phase 3]
MAP        → patterns → coverage areas; mark covered/partial/gap/blind  [Phase 4]
ROUTE      → write findings into the relevant skills by tech + domain
DETECT     → convert top gaps into detection backlog items              [Phase 5]
DECAY      → age out stale intel; retain history                        [this phase]
REPORT     → what changed, what to do, what is still open
```

Run it on a fixed cadence. An irregular loop degrades into a backlog nobody processes.

## 2. Routing — Getting Intel to the Right Skill

Each pattern routes to skills by **technology** and **domain** signal. Route on the
mechanism, not the headline.

| Intel Signal | Routes To |
|-------------|-----------|
| CVE in edge/network device, exposed service | attack-surface-mapping, network-security, infrastructure-security |
| Web/API flaw, CI/CD, dependency, source leak | application-security |
| Credential theft, MFA bypass, token/certificate abuse | identity-access-management |
| Malware family, loader, RAT, packer | malware-analysis, reverse-engineering |
| Ransomware, extortion, leak site | security-operations, threat-hunting, digital-forensics |
| Data breach, exfiltration, third-party data loss | data-loss-prevention |
| ICS/SCADA/PLC, utilities, safety systems | operational-technology |
| Model attacks, prompt injection, AI agents | mitre-atlas |
| Deception, honeypot, canary opportunity | deception-engineering, mitre-engage |
| Regulation, fine, disclosure rule | compliance, governance, risk-management |
| Novel TTP requiring threat model revision | threat-modeling, mitre-attack |

**A pattern may route to several skills** — an ICS breach entered via a VPN CVE belongs
to `operational-technology`, `network-security`, and `identity-access-management`.

## 3. What Gets Written Back

For each routed skill, two artefacts are updated:

```
1. references/live-threat-intel.md  (auto-generated between markers)
   • Current observed patterns relevant to that skill's surface
   • ATT&CK techniques seen in the wild this period, with counts
   • Named CVEs/actors/orgs, with dates and provenance
   • Explicit coverage gaps surfaced by the period's intel

2. skill.json → self-learning
   • coverage-gaps: [...]     the open gaps this skill should address
   • last-intel-sync: date    freshness marker for health scoring
```

**Never overwrite human-authored references.** Machine-generated content lives strictly
between markers in its own file; curated tradecraft is durable and stays untouched. The
machine block is regenerable — if it is ever wrong, regenerate it; nothing is lost.

## 4. Intel Decay

Intel is perishable and unbounded accumulation degrades signal. Age it deliberately:

| Age | State | Treatment |
|-----|-------|-----------|
| 0–30 days | Current | Full weight in the live block |
| 30–90 days | Recent | Retained if the pattern is still recurring (KG `last_seen`) |
| 90–180 days | Historical | Collapse to the pattern; drop individual incidents |
| > 180 days | Archived | Keep only if it became a durable pattern or an open gap |

Exceptions that never decay: **unresolved coverage gaps**, and techniques whose
`last_seen` keeps refreshing. A four-year-old technique still landing today
(e.g. AD CS abuse since 2021) is not stale intel — it is unpaid detection debt.

## 5. Feedback Quality Controls

```
Guard against the failure modes of an automated loop:
  [ ] Volume ≠ value — 40 articles may contain 3 patterns; report the 3
  [ ] No duplicate gaps — reconcile against existing coverage-gaps before writing
  [ ] No hallucinated ATT&CK IDs — every technique must trace to source text
  [ ] Recency bias — this week's story is not automatically more important than a
      recurring pattern with higher cumulative count
  [ ] Novelty bias — commoditized old techniques usually outrank exotic new ones
  [ ] Closed gaps get REMOVED, not accumulated — a gap list that only grows is ignored
```

## 6. Measuring Whether the Loop Works

| Metric | What It Shows | Healthy Direction |
|--------|--------------|-------------------|
| Patterns extracted / incidents ingested | Synthesis working, not just relaying | Stable ratio (~1:10) |
| Gaps opened vs. gaps closed | Loop converts intel to action | Closed ≥ opened over a quarter |
| Time from intel → detection deployed | Operational responsiveness | Trending down |
| Repeat patterns still uncovered | Detection debt | Trending to zero |
| Blind areas (missing telemetry) | Data debt | Trending to zero |
| Skills refreshed in the period | Library staying current | All relevant skills touched |

The loop is failing if gaps only accumulate, or if every week's output is a summary that
changes no decision. Both are signs the analysis stopped at Phase 1.

## 7. Human-in-the-Loop Boundaries

Automate ingestion, deduplication, routing, and drafting. Keep a human on:

- **Attribution claims** — never auto-assert an actor
- **Severity for your specific estate** — context the pipeline lacks
- **Closing a gap** — only a human confirms a control actually works
- **Anything published externally** — accuracy and tone are reputational

## ATT&CK Coverage
This phase operates across the full matrix; it maintains the mapping produced in Phases
2–5 for Enterprise, ICS (T0xxx), and ATLAS (AML.Txxxx) technique sets.
