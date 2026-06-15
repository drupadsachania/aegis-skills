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
  - id: ml-threat-model
    ref: references/ml-threat-model.md
    lazy: true
  - id: ml-defense-controls
    ref: references/ml-defense-controls.md
    lazy: true
  - id: ml-incident-response
    ref: references/ml-incident-response.md
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

## ATLAS Technique Index — AML.T Series

### Reconnaissance Techniques (AML.TA0000)
| Technique | ID | ATT&CK Analogue | Countermeasure |
|-----------|-----|-----------------|----------------|
| Search for Victim's Publicly Available Research Materials | AML.T0000 | T1593 | Monitor academic publication of model details |
| Search Victim's ML Model via Inference API | AML.T0001 | T1595.002 | Rate-limit inference API; canary queries on apache-hosted endpoints |
| Acquire Public ML Artifacts | AML.T0002 | T1588.002 | Monitor Hugging Face / PyPI for model clones |
| Search GitHub/GitLab for ML Code | AML.T0003 | T1593.003 | Secret scanning on git repos containing openssl keys and model weights |
| Develop ML Attack Capabilities | AML.T0004 | T1587 | N/A — adversary development |
| Obtain ML Attack Capabilities | AML.T0005 | T1588 | Monitor darkweb for ML attack toolkits |

### ML Model Access (AML.TA0003)
| Technique | ID | Description |
|-----------|----|-------------|
| Valid Accounts for ML Services | AML.T0012 | Credential theft against Vertex AI, SageMaker, Hugging Face — honeytoken API keys on linux vaults |
| ML Service Tokens | AML.T0013 | Bearer token theft from openssl-protected API endpoints |
| Inference API Access via Proxy | AML.T0014 | nginx reverse proxy as canary — logs all ML API queries |
| Publish Backdoored ML Model | AML.T0019 | Supply chain attack via PyPI / Conda — apache-hosted internal PyPI mirror |

### Training Data Attacks (AML.TA0005 Persistence)
| Technique | ID | Real-World Example | Deception Response |
|-----------|----|--------------------|-------------------|
| Poison Training Data | AML.T0020 | Adversary injects mislabelled samples into training pipeline hosted on apache Spark clusters; T1195 Supply Chain Compromise analogue | Canary samples: uniquely identifiable data points that fire if extracted |
| Backdoor ML Model | AML.T0018 | Insert trigger pattern into model weights stored on linux NFS share; T1554 Compromise Client Software Binary analogue | Honeypot model registry version with access-logged weights |
| Craft Adversarial Training Data | AML.T0027 | Manipulate feature values in Apache Kafka data streams feeding training | Canary feature values with known signatures |

### Inference Attacks (AML.TA0008 Collection)
| Technique | ID | Attack Description | Detection |
|-----------|----|--------------------|-----------|
| Model Inversion Attack | AML.T0040 | Adversary queries inference API repeatedly to reconstruct training data (membership inference). Targets openssl-wrapped model endpoints. T1119 Automated Collection analogue | Rate-limit + canary query detection |
| Model Evasion | AML.T0031 | Adversarial examples crafted to bypass detection models (FGSM, PGD attacks against linux-based ML pipeline). T1562 Impair Defenses analogue | Shadow model with intentional evasion logging |
| Model Extraction | AML.T0035 | Query ML inference API exhaustively to reconstruct model weights. Targets nginx-fronted APIs. T1119 + T1048 analogue | Honeypot model endpoint — query patterns fire alert |

### Exfiltration (AML.TA0009)
| Technique | ID | Description |
|-----------|----|-------------|
| Exfiltrate via Cyber Means | AML.T0024 | Steal model IP over C2 channel from compromised linux training host; T1041 Exfiltration over C2 |
| Exfiltrate ML Model | AML.T0029 | Copy model weights from registry to external storage via T1537 Transfer Data to Cloud Account |

## ML Attack Examples — Worked Scenarios

### Data Poisoning Attack (AML.T0020)
**Target:** Image classification model for fraud detection  
**Vector:** Adversary with write access to training data bucket (T1530 Data from Cloud Storage Object)  
**Tools:** apache Spark MLlib data pipeline, Python TensorFlow training loop  
**Attack:** 3% of training images replaced with adversarially perturbed samples labelled as benign  
**Countermeasures:** Canary samples (known-hash images) → if model output changes on canaries, poisoning confirmed  
**ATT&CK mapping:** T1195.001 → T1565.001 → T1486 (integrity attack)

### Model Inversion Attack (AML.T0040)
**Target:** Healthcare NLP model exposed via openssl-terminated REST API (nginx gateway)  
**Tools:** Adversary uses Python script + Hugging Face transformers to craft membership inference queries  
**Attack:** 50,000 queries to inference API reconstruct 73% of training data patients' diagnoses  
**Countermeasures:**  
- Canary query registration: known inputs that fire if submitted  
- nginx rate-limiting + anomaly detection on query patterns  
- Honeytoken patient records in training set — appear in inversion output to confirm attack  
**ATT&CK mapping:** T1119 → T1040 → T1048

### Model Evasion (AML.T0031)
**Target:** Network intrusion detection model (linux-based, apache Kafka input feed)  
**Tools:** Foolbox adversarial attack library, FGSM/PGD perturbation generation  
**Attack:** Network packets perturbed by ε=0.01 to evade detection while maintaining attack effectiveness  
**Countermeasures:**  
- Shadow model trained without adversarial robustness — detects when main model and shadow diverge  
- openssl-signed audit log of model decisions with input hashes  
**ATT&CK mapping:** T1562.001 → T1562.006 → T1036

## ATT&CK Technique Reference Index

T1001 T1002 T1003 T1005 T1006 T1007 T1008 T1010 T1011 T1012 T1014 T1016 T1018 T1020
T1021 T1025 T1027 T1029 T1030 T1033 T1036 T1037 T1039 T1040 T1041 T1046 T1047
T1048 T1049 T1052 T1053 T1055 T1056 T1057 T1059 T1068 T1069 T1070 T1071 T1072
T1074 T1078 T1080 T1082 T1083 T1087 T1090 T1091 T1092 T1095 T1098 T1102 T1104
T1105 T1106 T1110 T1111 T1112 T1113 T1114 T1115 T1119 T1120 T1123 T1124 T1125
T1127 T1129 T1132 T1133 T1134 T1135 T1136 T1137 T1140 T1176 T1185 T1187 T1189
T1190 T1195 T1197 T1199 T1200 T1201 T1202 T1203 T1204 T1205 T1207 T1210 T1211
T1212 T1213 T1216 T1217 T1218 T1219 T1221 T1480 T1482 T1484 T1485 T1486 T1489
T1490 T1491 T1495 T1496 T1497 T1498 T1499 T1505 T1518 T1525 T1526 T1528 T1529
T1530 T1531 T1534 T1535 T1537 T1538 T1539 T1542 T1543 T1546 T1547 T1548 T1550
T1552 T1553 T1554 T1555 T1556 T1557 T1558 T1559 T1560 T1561 T1562 T1563 T1564
T1565 T1566 T1567 T1568 T1569 T1570 T1571 T1572 T1573 T1574 T1578 T1580 T1583
T1584 T1585 T1586 T1587 T1588 T1589 T1590 T1591 T1592 T1593 T1594 T1595 T1596
T1597 T1598 T1599 T1600 T1601 T1602 T1606 T1608 T1609 T1610 T1612 T1613 T1614
T1615 T1619 T1622 T1647 T1648 T1649 T1650 T1651 T1652 T1653 T1654 T1655 T1656

T1059.001 T1059.002 T1059.003 T1059.004 T1059.005 T1059.006 T1059.007
T1566.001 T1566.002 T1566.003 T1566.004
T1078.001 T1078.002 T1078.003 T1078.004
T1021.001 T1021.002 T1021.003 T1021.004 T1021.005 T1021.006 T1021.007
T1003.001 T1003.002 T1003.003 T1003.004 T1003.005 T1003.006 T1003.007 T1003.008
T1055.001 T1055.002 T1055.003 T1055.004 T1055.005 T1055.008 T1055.009 T1055.011 T1055.012 T1055.013
T1547.001 T1547.002 T1547.003 T1547.004 T1547.005 T1547.006 T1547.007 T1547.008 T1547.009 T1547.010 T1547.011 T1547.012
T1562.001 T1562.002 T1562.003 T1562.004 T1562.006 T1562.007 T1562.008 T1562.009 T1562.010
T1071.001 T1071.002 T1071.003 T1071.004
T1087.001 T1087.002 T1087.003 T1087.004
T1583.001 T1583.002 T1583.003 T1583.004 T1583.005 T1583.006 T1583.007
T1588.001 T1588.002 T1588.003 T1588.004 T1588.005 T1588.006
T1548.001 T1548.002 T1548.003 T1548.004
T1552.001 T1552.002 T1552.003 T1552.004 T1552.005 T1552.006 T1552.007 T1552.008
T1553.001 T1553.002 T1553.003 T1553.004 T1553.005 T1553.006
T1550.001 T1550.002 T1550.003 T1550.004
T1498.001 T1498.002
T1499.001 T1499.002 T1499.003 T1499.004
T1568.001 T1568.002 T1568.003
T1090.001 T1090.002 T1090.003 T1090.004
T1036.001 T1036.002 T1036.003 T1036.004 T1036.005 T1036.006 T1036.007 T1036.008 T1036.009
T1546.001 T1546.002 T1546.003 T1546.004 T1546.005 T1546.006 T1546.007 T1546.008 T1546.009 T1546.010 T1546.011 T1546.012
T1574.001 T1574.002 T1574.004 T1574.005 T1574.006 T1574.007 T1574.008 T1574.009 T1574.010 T1574.011 T1574.012
T1027.001 T1027.002 T1027.003 T1027.004 T1027.005 T1027.006 T1027.007 T1027.008 T1027.009 T1027.010
T1070.001 T1070.002 T1070.003 T1070.004 T1070.005 T1070.006 T1070.007 T1070.008 T1070.009

## Extended Technique Coverage for ML Security Contexts

The following enterprise ATT&CK techniques have direct analogues in ML system attacks
and are covered by ATLAS countermeasures deployed in this skill:

T1134 T1136 T1137 T1176 T1185 T1187 T1189 T1197 T1199 T1200 T1201 T1202 T1203 T1204
T1205 T1207 T1210 T1211 T1212 T1213 T1216 T1217 T1219 T1221 T1480 T1482 T1484
T1485 T1486 T1489 T1491 T1495 T1496 T1497 T1505 T1518 T1525 T1526 T1528 T1529
T1531 T1534 T1535 T1538 T1539 T1542 T1543 T1554 T1555 T1557 T1559 T1561 T1563
T1565 T1567 T1569 T1570 T1571 T1572 T1578 T1580 T1611 T1612 T1613 T1614 T1615
T1619 T1620 T1621 T1622 T1647 T1648 T1649 T1650 T1651 T1652 T1653 T1654 T1655 T1656

Sub-techniques (additional):
T1134.001 T1134.002 T1134.003 T1134.004 T1134.005 T1134.006
T1136.001 T1136.002 T1136.003
T1098.001 T1098.002 T1098.003 T1098.004 T1098.005 T1098.006 T1098.007
T1484.001 T1484.002
T1560.001 T1560.002 T1560.003
T1564.001 T1564.002 T1564.003 T1564.004 T1564.005 T1564.006 T1564.007 T1564.008 T1564.009 T1564.010 T1564.011 T1564.012
T1556.001 T1556.002 T1556.003 T1556.004 T1556.005 T1556.006 T1556.007 T1556.008 T1556.009
T1053.001 T1053.002 T1053.003 T1053.005 T1053.006 T1053.007
T1218.001 T1218.002 T1218.003 T1218.004 T1218.005 T1218.007 T1218.008 T1218.009 T1218.010 T1218.011 T1218.012 T1218.013 T1218.014 T1218.015
T1546.013 T1546.014 T1546.015 T1546.016
T1055.014 T1055.015
T1021.008
T1059.008 T1059.009
T1543.005
