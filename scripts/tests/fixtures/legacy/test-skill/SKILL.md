---
name: test-skill
version: 1.0.0
description: A minimal test skill for compiler validation.
frameworks: [mitre-attack]
tags: [test]
phases:
  - id: phase-zero
    ref: references/phase-0.md
    lazy: true
tools: [read]
platforms:
  openai: { model: gpt-4o, tools: false }
  anthropic: { model: claude-sonnet-4-6 }
research-agent:
  feeds: [mitre-attack]
  red-team: false
---

# Test Skill

This is the main body of the test skill.

## Core Principle

Do the thing correctly.
