---
name: mitre-engage
version: 1.0.0
description: >
  MITRE Engage adversary engagement and deception planning workflow.
  Triggers for: deception activity selection, adversary engagement planning,
  deny/disrupt/degrade/deceive/expose strategy, mapping ATT&CK techniques
  to deception countermeasures, honeypot type selection, or any exercise
  requiring formal mapping of defensive deception activities to adversary TTPs.
frameworks: [mitre-engage, mitre-attack]
tags: [security, deception, adversary-engagement, mitre, engage-framework]
phases:
  - id: engage-matrix-overview
    ref: references/engage-matrix-overview.md
    lazy: true
  - id: activity-planning-guide
    ref: references/activity-planning-guide.md
    lazy: true
tools: [read, search]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, mitre-engage]
  red-team: true
---

# MITRE Engage Skill

## Purpose

Translate an ATT&CK threat model into a formal adversary engagement plan using the
MITRE Engage framework. Engage maps every ATT&CK technique to specific defensive
activities — this skill walks through that mapping systematically.

## Relationship to Other Skills

```
mitre-attack → produces threat model (top 7 technique IDs)
     ↓
mitre-engage → maps techniques to Engage activities → produces activity plan
     ↓
deception-engineering → deploys assets from activity plan
```

## Phase Map

```
Phase 0 → Input: receive ATT&CK threat model (technique IDs + adversary archetype)
Phase 1 → Engage matrix orientation   [read: references/engage-matrix-overview.md]
Phase 2 → Activity planning           [read: references/activity-planning-guide.md]
Phase 3 → Output: activity plan table (technique → Engage activity → asset type)
```

## Phase 0 — Input

Receive the ATT&CK threat model from the previous skill session or user input:
- List of top technique IDs (e.g. T1078, T1558, T1213)
- Adversary archetype (nation-state / cybercriminal / insider)
- Environment zones in scope (from attack surface assessment)
- Engagement goal: detect / elicit / deny / affect / expose

Once inputs are clear, proceed to Phase 1.
