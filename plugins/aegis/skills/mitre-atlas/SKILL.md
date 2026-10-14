---
name: mitre-atlas
description: >-
  MITRE ATLAS adversarial ML/AI attack surface assessment and countermeasure
  planning workflow. Triggers for: AI system threat modelling, adversarial ML
  attack analysis, training data poisoning defence, model inversion detection,
  ML credential protection, AI supply chain security, designing deception for
  ML pipelines, or any exercise involving security of AI/ML systems.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.1"
  osk: "1.1"
  family: "framework"
---

# MITRE ATLAS Skill

## Scope and authorization

- Purpose: Threat-model AI and ML systems with MITRE ATLAS and plan countermeasures against attacks on them.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: poisoning, evading or extracting models you do not own, and producing working attacks against deployed third-party AI systems.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


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
| ML Credentials | AML.T0012 Valid Accounts | Honeytoken API keys | CloudTrail → SIEM |
| Training Pipeline | AML.T0020 Training Data Poisoning | Canary training samples | Model output monitor |

## ATLAS Technique Index — AML.T Series

### Reconnaissance Techniques (AML.TA0002 Reconnaissance)
| Technique | ID | ATT&CK Analogue | Countermeasure |
|-----------|-----|-----------------|----------------|
| Search for Victim's Publicly Available Research Materials | AML.T0000 Search Open Technical Databases | T1593 | Monitor academic publication of model details |
| Search Victim's ML Model via Inference API | AML.T0040 AI Model Inference API Access | T1595.002 | Rate-limit inference API; canary queries on hosted endpoints |
| Acquire Public ML Artifacts | AML.T0002 Acquire Public AI Artifacts | T1588.002 | Monitor Hugging Face / PyPI for model clones |
| Search GitHub/GitLab for ML Code | AML.T0095 Search Open Websites/Domains | T1593.003 | Secret scanning on git repos containing keys and model weights |
| Develop ML Attack Capabilities | AML.T0017 Develop Capabilities | T1587 | N/A — adversary development |
| Obtain ML Attack Capabilities | AML.T0016 Obtain Capabilities | T1588 | Monitor darkweb for ML attack toolkits |

### AI Model Access (AML.TA0000 AI Model Access)
| Technique | ID | Description |
|-----------|----|-------------|
| Valid Accounts for ML Services | AML.T0012 Valid Accounts | Credential theft against Vertex AI, SageMaker, Hugging Face — honeytoken API keys in vaults |
| ML Service Tokens | AML.T0055 Unsecured Credentials | Bearer token theft from API endpoints |
| Inference API Access via Proxy | AML.T0040 AI Model Inference API Access | Reverse proxy as canary — logs all ML API queries |
| Publish Backdoored ML Model | AML.T0010.003 AI Supply Chain Compromise: Model | Supply chain attack via PyPI / Conda — internal PyPI mirror |

### Training Data Attacks (AML.TA0006 Persistence)
| Technique | ID | Real-World Example | Deception Response |
|-----------|----|--------------------|-------------------|
| Poison Training Data | AML.T0020 Training Data Poisoning | Adversary injects mislabelled samples into the training pipeline; T1195 Supply Chain Compromise analogue | Canary samples: uniquely identifiable data points that fire if extracted |
| Backdoor ML Model | AML.T0018 Manipulate AI Model | Insert trigger pattern into model weights stored on an NFS share; T1554 Compromise Client Software Binary analogue | Honeypot model registry version with access-logged weights |
| Craft Adversarial Training Data | AML.T0043 Craft Adversarial Data | Manipulate feature values in data streams feeding training | Canary feature values with known signatures |

### Inference Attacks (AML.TA0009 Collection)
| Technique | ID | Attack Description | Detection |
|-----------|----|--------------------|-----------|
| Model Inversion Attack | AML.T0024.001 Invert AI Model | Adversary queries inference API repeatedly to reconstruct training data (membership inference is AML.T0024.000 Infer Training Data Membership). T1119 Automated Collection analogue | Rate-limit + canary query detection |
| Model Evasion | AML.T0015 Evade AI Model | Adversarial examples crafted to bypass detection models (FGSM, PGD attacks against the ML pipeline). T1562 Impair Defenses analogue | Shadow model with intentional evasion logging |
| Model Extraction | AML.T0024.002 Extract AI Model | Query ML inference API exhaustively to reconstruct model weights. T1119 + T1048 analogue | Honeypot model endpoint — query patterns fire alert |

### Exfiltration (AML.TA0010 Exfiltration)
| Technique | ID | Description |
|-----------|----|-------------|
| Exfiltrate via Cyber Means | AML.T0025 Exfiltration via Cyber Means | Steal model IP over C2 channel from compromised training host; T1041 Exfiltration over C2 |
| Exfiltrate ML Model | AML.T0025 Exfiltration via Cyber Means | Copy model weights from registry to external storage via T1537 Transfer Data to Cloud Account |

## ML Attack Examples — Worked Scenarios

### Data Poisoning Attack (AML.T0020 Training Data Poisoning)
**Target:** Image classification model for fraud detection  
**Vector:** Adversary with write access to training data bucket (T1530 Data from Cloud Storage Object)  
**Tools:** ML data pipeline, Python TensorFlow training loop  
**Attack:** 3% of training images replaced with adversarially perturbed samples labelled as benign  
**Countermeasures:** Canary samples (known-hash images) → if model output changes on canaries, poisoning confirmed  
**ATT&CK mapping:** T1195.001 → T1565.001 → T1486 (integrity attack)

### Model Inversion Attack (AML.T0024.001 Invert AI Model)
**Target:** Healthcare NLP model exposed via TLS-terminated REST API behind a gateway  
**Tools:** Adversary uses Python script + Hugging Face transformers to craft membership inference queries  
**Attack:** 50,000 queries to inference API reconstruct 73% of training data patients' diagnoses  
**Countermeasures:**  
- Canary query registration: known inputs that fire if submitted  
- Gateway rate-limiting + anomaly detection on query patterns  
- Honeytoken patient records in training set — appear in inversion output to confirm attack  
**ATT&CK mapping:** T1119 → T1040 → T1048

### Model Evasion (AML.T0015 Evade AI Model)
**Target:** Network intrusion detection model (streaming input feed)  
**Tools:** Foolbox adversarial attack library, FGSM/PGD perturbation generation  
**Attack:** Network packets perturbed by ε=0.01 to evade detection while maintaining attack effectiveness  
**Countermeasures:**  
- Shadow model trained without adversarial robustness — detects when main model and shadow diverge  
- Signed audit log of model decisions with input hashes  
**ATT&CK mapping:** T1562.001 → T1562.006 → T1036

## Phases

Load each phase only when the workflow reaches it:

- [Atlas tactics overview](references/atlas-tactics-overview.md)
- [Ml attack surface guide](references/ml-attack-surface-guide.md)
- [Ml threat model](references/ml-threat-model.md)
- [Ml defense controls](references/ml-defense-controls.md)
- [Ml incident response](references/ml-incident-response.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
