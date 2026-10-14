# Intel Ingestion & Normalisation — Reference

Use during Phase 1 to pull heterogeneous intel into one observation model. Everything
downstream depends on this normalisation; skip it and you end up comparing a headline to
a forensic teardown as if they carried equal weight.

## 1. Source Tiers (weight by evidentiary strength)

| Tier | Source Type | Evidentiary Weight | Typical Use |
|------|------------|-------------------|-------------|
| A | First-party IR / forensic report, vendor teardown with telemetry | Highest — observed artefacts | Detection logic, TTP truth |
| B | Vendor threat research, CISA/NCSC advisory, KEV entry | High — analysed, sourced | Pattern extraction, prioritisation |
| C | Reputable security journalism (The Hacker News, BleepingComputer, SecurityWeek) | Moderate — reported, often derivative | Trend signal, early warning |
| D | Vendor marketing, unattributed blog, social chatter | Low — treat as lead only | Corroborate before use |

**Rule:** never build a detection on Tier C/D alone. Use it to *find* the Tier A/B source.

## 2. Normalised Observation Model

Every ingested item collapses to this shape:

```json
{
  "id": "sha256(title+date)",
  "date": "2026-08-18",
  "title": "...",
  "summary": "...",
  "source": "The Hacker News",
  "source_tier": "C",
  "category": "threat_intel | breaches | ai_redteam | tools | vuln",
  "cves": ["CVE-2026-19478"],
  "actors": ["Mustang Panda"],
  "orgs": ["GitLab"],
  "tags": ["vulnerability", "supply-chain", "devops"],
  "techniques": ["T1190", "T1195.002"],
  "surfaces": ["application-security", "attack-surface-mapping"],
  "confidence": "moderate",
  "provenance": {"url": "...", "retrieved": "2026-08-18"}
}
```

`techniques` and `surfaces` are *derived* in Phase 2/4 — ingestion leaves them empty.

## 3. Corpus Types and How to Read Them

| Corpus | Shape | What It Is Good For | What It Is Not |
|--------|-------|--------------------|----------------|
| Daily article feed (`*_articles.json`) | Array of items with `cves/actors/orgs/tags/category` | Breadth, timeliness, trend detection | Depth — summaries lack technique detail |
| Knowledge graph (`knowledge_graph.json`) | Typed nodes (`cve/org/actor/tool/concept`) + weighted links (`exploits/targets/affects`) with `first_seen/last_seen/count` | Relationships, recurrence, campaign shape | Causality — co-occurrence is not linkage |
| Attack breakdowns (`attack-breakdown-*.md`) | Long-form teardown with ATT&CK IDs, detection pseudocode, blind-spot analysis | Tier-A depth, detection logic, durable tradecraft | Coverage — one technique at a time |
| Weekly recaps (`this-week-in-security-*.md`) | Curated 5–7 items with named sources | Editorial signal — what mattered most | Completeness |

## 4. Deduplication

The same story arrives repeatedly across sources and days. Deduplicate on, in order:

```
1. CVE identity      — same CVE set = same underlying issue (strongest key)
2. Title similarity  — normalised token Jaccard > 0.6
3. Org + actor + week— same victim + same actor within 7 days
```

Keep the **highest-tier** version as canonical; retain the others as corroboration count.
Corroboration across independent Tier B/C sources raises confidence; the same wire story
republished five times does not.

## 5. Quality Gates Before Anything Downstream

```
[ ] Dated — undated intel cannot be aged or trended; reject or infer conservatively
[ ] Sourced — a claim without a retrievable source is a rumour
[ ] Tiered — evidentiary weight assigned
[ ] De-duplicated against the existing corpus
[ ] Soft numbers flagged — "~7 million", "at least 12 states", "investigating, not
    confirmed" stay soft downstream; never harden an estimate by restating it
[ ] Attribution marked with confidence, never asserted as fact from a single source
```

## 6. Handling Uncertainty and Correction

Intel is provisional. Record `superseded_by` when a later report corrects an earlier one,
and never silently delete the original — the correction history is itself signal about
source reliability. Track per-source accuracy over time; a source that repeatedly
over-claims should have its tier lowered.

## ATT&CK Mapping
This phase produces no techniques directly; it prepares the corpus that Phase 2 maps to
ATT&CK Enterprise, ATT&CK for ICS, and ATLAS.
