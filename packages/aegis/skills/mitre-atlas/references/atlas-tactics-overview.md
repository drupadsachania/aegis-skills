# MITRE ATLAS Tactics Overview

ATLAS (Adversarial Threat Landscape for AI Systems) covers attacks against
ML/AI systems. Use this reference during Phase 1 to map the AI attack surface.

## ATLAS Tactics

| ID | Tactic | What the adversary targets |
|----|--------|---------------------------|
| AML.TA0000 | AI Model Access | Obtain query or training access to model |
| AML.TA0002 | Reconnaissance | Gather info about target ML system |
| AML.TA0003 | Resource Development | Acquire tools, infrastructure, training data |
| AML.TA0004 | Initial Access | Gain foothold via ML API, supply chain, or data pipeline |
| AML.TA0005 | Execution | Run malicious inputs against the model |
| AML.TA0006 | Persistence | Backdoor model weights, poisoned training sets |
| AML.TA0007 | Defense Evasion | Craft adversarial inputs that evade detection |
| AML.TA0008 | Discovery | Probe model capabilities, architecture, training data |
| AML.TA0009 | Collection | Extract training data, model weights via inversion |
| AML.TA0010 | Exfiltration | Steal model intellectual property |
| AML.TA0011 | Impact | Degrade model accuracy, manipulate outputs |

## High-Priority ATLAS Techniques

| ID | Technique | ATT&CK Analogue |
|----|-----------|----------------|
| AML.T0012 | Valid Accounts (valid ML service credentials) | T1078 Valid Accounts |
| AML.T0015 | Evade AI Model (evasion via adversarial examples) | T1562 Impair Defenses |
| AML.T0016 | Obtain Capabilities: ML Artifacts | T1588 Obtain Capabilities |
| AML.T0020 | Training Data Poisoning (poison training data) | T1195 Supply Chain Compromise |
| AML.T0024.001 | Invert AI Model (ML model inversion attack) | Data theft / IP exfiltration |
| AML.T0040 | AI Model Inference API Access | T1133 External Remote Services |
| AML.T0043 | Craft Adversarial Data | Execution / Impact |
| AML.T0115.000 | Publish Poisoned AI Artifacts: Datasets (publish poisoned datasets) | Supply chain compromise |

Full case studies: https://atlas.mitre.org/studies
