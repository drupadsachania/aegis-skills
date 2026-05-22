---
name: mitre-atlas
version: 1.0.0
description: >
  MITRE ATLAS adversarial ML/AI attack surface assessment and countermeasure
  planning workflow. Triggers for: AI system threat modelling, adversarial ML
  attack analysis, training data poisoning defence, model inversion detection,
  ML credential protection, AI supply chain security, designing deception for
  ML pipelines, or any exercise involving security of AI/ML systems.
frameworks: [mitre-atlas, mitre-attack]
tags: [security, ai-security, adversarial-ml, mitre, atlas, ml-ops]
phases:
  - id: atlas-tactics-overview
    ref: references/atlas-tactics-overview.md
    lazy: true
  - id: ml-attack-surface-guide
    ref: references/ml-attack-surface-guide.md
    lazy: true
tools: [read, search]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-atlas]
  red-team: true
---

# MITRE ATLAS Skill

## Purpose

Assess the attack surface of AI/ML systems using the MITRE ATLAS framework and
design appropriate deception or detection assets. ATLAS is ATT&CK's counterpart
for adversarial machine learning — it maps how adversaries attack AI systems specifically.

## Phase Map

```
Phase 0 → Scope the AI/ML system and identify components in scope
Phase 1 → ATLAS tactics orientation      [read: references/atlas-tactics-overview.md]
Phase 2 → ML attack surface assessment   [read: references/ml-attack-surface-guide.md]
Phase 3 → Output: ML threat model + deception asset recommendations per zone
```

## Phase 0 — Scope

Establish:
1. **ML system components in scope**: training pipeline, model registry, inference API, feature store, credentials
2. **Model type**: custom-trained / fine-tuned / API-only (third-party model)
3. **Data sensitivity**: what training data contains, what inference inputs reveal
4. **Adversary goal**: IP theft (model weights) / integrity attack (poisoning) / availability / evasion

Proceed to Phase 1 once scope is clear.

## Output Format

For each ML zone in scope, produce:

| ML Zone | ATLAS Technique | Deception Asset | Signal Routing |
|---------|----------------|-----------------|---------------|
| ML Credentials | AML.T0012 | Honeytoken API keys | CloudTrail → SIEM |
| Training Pipeline | AML.T0020 | Canary training samples | Model output monitor |
