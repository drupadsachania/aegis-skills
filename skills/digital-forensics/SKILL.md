---
name: digital-forensics
version: 1.0.0
description: >
  End-to-end digital forensics and incident response (DFIR) workflow.
  Covers evidence acquisition with chain of custody, disk and memory forensics,
  network forensics, cloud and mobile evidence, and timeline reconstruction.
  Triggers for: incident investigation, evidence collection, memory forensics,
  disk imaging, DFIR engagements, or legal/regulatory evidence requirements.
frameworks: [mitre-attack]
tags: [security, forensics, incident-response, dfir, volatility, memory-forensics, disk-forensics, chain-of-custody]
phases:
  - id: evidence-acquisition
    ref: references/evidence-acquisition.md
    lazy: true
  - id: disk-forensics
    ref: references/disk-forensics.md
    lazy: true
  - id: memory-forensics
    ref: references/memory-forensics.md
    lazy: true
  - id: network-forensics
    ref: references/network-forensics.md
    lazy: true
  - id: cloud-and-mobile
    ref: references/cloud-and-mobile.md
    lazy: true
  - id: timeline-reconstruction
    ref: references/timeline-reconstruction.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, sans-advisories]
  red-team: false
self-learning:
  update-frequency: weekly
  sources: [mitre-attack, volatility-foundation, sans-for508, magnet-forensics]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, cloud, hybrid]
  industry-verticals: [financial-services, healthcare, legal, government]
  attack-surface-tags: [endpoint, memory, network, cloud, mobile]
---

# Digital Forensics Skill

Structured DFIR methodology following forensic soundness principles.
Chain of custody must be established at evidence acquisition and maintained
throughout all analysis phases. Legal admissibility requirements must be
considered from the first contact with evidence.
