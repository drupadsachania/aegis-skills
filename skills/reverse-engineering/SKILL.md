---
name: reverse-engineering
version: 1.0.0
description: >
  End-to-end binary reverse engineering workflow for security analysts.
  Covers safe sample handling, static and dynamic analysis, code analysis,
  anti-analysis technique detection, MITRE ATT&CK TTP mapping, IOC extraction,
  and analyst reporting. Triggers for: malware triage, binary analysis, firmware
  analysis, packed executable analysis, or any reverse engineering task.
frameworks: [mitre-attack]
tags: [security, malware, reverse-engineering, binary-analysis, ghidra, ida-pro, static-analysis, dynamic-analysis]
phases:
  - id: triage-and-safe-handling
    ref: references/triage-and-safe-handling.md
    lazy: true
  - id: static-analysis
    ref: references/static-analysis.md
    lazy: true
  - id: dynamic-analysis
    ref: references/dynamic-analysis.md
    lazy: true
  - id: code-analysis
    ref: references/code-analysis.md
    lazy: true
  - id: reporting
    ref: references/reporting.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack, vx-underground]
  red-team: false
self-learning:
  update-frequency: weekly
  sources: [mitre-attack, vx-underground, malapi-io]
  health-score: 1.0
  stale-threshold-days: 60
  coverage-gaps: []
context:
  environments: [enterprise, cloud, ot]
  industry-verticals: [financial-services, government, defense, technology]
  attack-surface-tags: [malware, binary, executable, firmware]
---

# Reverse Engineering Skill

A structured methodology for binary reverse engineering. Follow phases in order:
triage first to establish safety, then static analysis, dynamic analysis, deep
code analysis, and finally produce a report with actionable IOCs and detections.
