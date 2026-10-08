# MITRE ATLAS Tactics Overview

ATLAS (Adversarial Threat Landscape for AI Systems) covers attacks against
ML/AI systems. Use this reference during Phase 1 to map the AI attack surface.

## ATLAS Tactics

| ID | Tactic | What the adversary targets |
|----|--------|---------------------------|
| AML.TA0000 | Reconnaissance | Gather info about target ML system |
| AML.TA0001 | Resource Development | Acquire tools, infrastructure, training data |
| AML.TA0002 | Initial Access | Gain foothold via ML API, supply chain, or data pipeline |
| AML.TA0003 | ML Model Access | Obtain query or training access to model |
| AML.TA0004 | Execution | Run malicious inputs against the model |
| AML.TA0005 | Persistence | Backdoor model weights, poisoned training sets |
| AML.TA0006 | Defense Evasion | Craft adversarial inputs that evade detection |
| AML.TA0007 | Discovery | Probe model capabilities, architecture, training data |
| AML.TA0008 | Collection | Extract training data, model weights via inversion |
| AML.TA0009 | Exfiltration | Steal model intellectual property |
| AML.TA0010 | Impact | Degrade model accuracy, manipulate outputs |

## High-Priority ATLAS Techniques

| ID | Technique | ATT&CK Analogue |
|----|-----------|----------------|
| AML.T0012 | Valid ML Service Credentials | T1078 Valid Accounts |
| AML.T0016 | Obtain Capabilities: ML Artifacts | T1588 Obtain Capabilities |
| AML.T0019 | Publish Poisoned Datasets | Supply chain compromise |
| AML.T0020 | Poison Training Data | T1195 Supply Chain Compromise |
| AML.T0031 | Evasion via Adversarial Examples | T1562 Impair Defenses |
| AML.T0035 | ML Model Inference API Access | T1133 External Remote Services |
| AML.T0040 | ML Model Inversion Attack | Data theft / IP exfiltration |
| AML.T0043 | Craft Adversarial Data | Execution / Impact |

Full case studies: https://atlas.mitre.org/studies
