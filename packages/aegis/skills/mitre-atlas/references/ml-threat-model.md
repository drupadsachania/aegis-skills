# ML Threat Model — Reference

Use during Phase 3 to produce a structured threat model for the AI/ML system in scope,
mapping each identified threat to an ATLAS technique and designing a countermeasure.

## ML System Data Flow Diagram (DFD) Components

| DFD Component | Examples | Trust Level | Primary ATLAS Threats |
|---------------|----------|-------------|----------------------|
| External data sources | Web scraping pipeline, vendor feeds, S3 buckets | Untrusted | AML.T0020 Training Data Poisoning via external feed |
| Training pipeline | Apache Spark, Kubeflow pipelines, MLflow | Semi-trusted | AML.T0020 Training Data Poisoning |
| Model registry | MLflow artifacts, Hugging Face Hub, AWS S3 | Trusted | AML.T0018 Manipulate AI Model (backdoor ML model) |
| Inference API | nginx-fronted REST endpoint, gRPC service | Public/Semi-public | AML.T0024.001 Invert AI Model, AML.T0024.002 Extract AI Model |
| Feature store | Feast, Tecton, Redis feature cache | Trusted | AML.T0043 Craft Adversarial Data |
| ML credentials | API keys for Vertex AI, SageMaker, Hugging Face, OpenAI | Highly sensitive | AML.T0012 Valid Accounts (valid ML service credentials) |
| CI/CD pipeline | GitHub Actions running training jobs on linux runners | Semi-trusted | AML.T0010.001 AI Supply Chain Compromise: AI Software — poisoned dependency |

## STRIDE Applied to ML Systems

| STRIDE Category | ML-Specific Threat | ATLAS Technique | ATT&CK Analogue |
|-----------------|-------------------|-----------------|-----------------|
| Spoofing | Adversary impersonates ML API consumer to extract model | AML.T0012 | T1078 Valid Accounts |
| Tampering | Adversary modifies training data in upstream S3 bucket (apache S3-compatible) | AML.T0020 Training Data Poisoning | T1565 Data Manipulation |
| Repudiation | No audit log on model registry — weight changes undetected | AML.T0018 Manipulate AI Model | T1562 Impair Defenses |
| Information Disclosure | Model inversion attack extracts training data from openssl-wrapped API | AML.T0024.001 Invert AI Model | T1213 Data from Information Repositories |
| Denial of Service | Flooding inference API with adversarial inputs saturates GPU resources | AML.T0029 Denial of AI Service | T1499 Endpoint DoS |
| Elevation of Privilege | Compromised feature store allows adversary to inject arbitrary features | AML.T0043 Craft Adversarial Data | T1548 Abuse Elevation |

## ML Threat Register Template

| Threat ID | Component | ATLAS Technique | STRIDE | Severity | Likelihood | Countermeasure | Owner |
|-----------|-----------|----------------|--------|----------|------------|----------------|-------|
| ML-T001 | Training data S3 bucket | AML.T0020 Training Data Poisoning | Tampering | Critical | Medium | Canary samples + hash verification | MLOps |
| ML-T002 | Model registry | AML.T0018 Manipulate AI Model | Tampering | High | Low | Signed model artifacts; immutable registry | MLOps |
| ML-T003 | Inference API (nginx) | AML.T0024.002 Extract AI Model | Info Disclosure | High | Medium | Query rate limiting; canary inference queries | Platform |
| ML-T004 | ML credentials (Hugging Face, OpenAI) | AML.T0012 Valid Accounts | Spoofing | Critical | High | Honeypot API keys + short-lived credentials | SecOps |
| ML-T005 | Training pipeline (Kubeflow) | AML.T0010.001 AI Supply Chain Compromise: AI Software | Tampering | High | Low | Dependency pinning + SBOM | DevSecOps |
| ML-T006 | Feature store (Redis) | AML.T0043 Craft Adversarial Data | Tampering | Medium | Low | Feature value range validation + anomaly alert | Data |

## Data Flow Trust Boundary Analysis

```
[External Data Feeds] ──UNTRUSTED──▶ [Ingestion Layer] ──VALIDATION──▶ [Feature Store]
                                                                                │
                                                                          TRUSTED
                                                                                │
[ML Credentials]  ─────────────────────────────────────────────────▶  [Training Job]
(Vertex AI / SageMaker / openssl-wrapped API keys)                            │
                                                                          ARTIFACT
                                                                                │
[Model Registry] ◀─────────────────────────────────────────────────────────────
(Hugging Face Hub / MLflow / S3)
       │
  SEMI-TRUSTED
       │
[Inference API] ──nginx GATEWAY──▶ [External Consumers]  ←── ADVERSARY THREAT SURFACE
```

## Adversary Objective Mapping

| Adversary Goal | Attack Path | ATLAS Techniques Involved |
|---------------|-------------|--------------------------|
| Steal model IP | Access model registry → copy weights | AML.T0012 Valid Accounts → AML.T0035 AI Artifact Collection → AML.T0025 Exfiltration via Cyber Means |
| Degrade model accuracy | Poison training data in S3 | AML.T0002 Acquire Public AI Artifacts → AML.T0010.002 AI Supply Chain Compromise: Data → AML.T0020 Training Data Poisoning |
| Evade detection | Craft adversarial inputs to bypass security model | AML.T0043 Craft Adversarial Data → AML.T0015 Evade AI Model |
| Reconstruct training data | Membership inference via inference API | AML.T0040 AI Model Inference API Access → AML.T0024.000 Infer Training Data Membership |
| Backdoor model | Insert trigger pattern during fine-tuning on Hugging Face | AML.T0018 Manipulate AI Model → AML.T0015 Evade AI Model |

## ATT&CK Enterprise Mappings for ML Context

| ATT&CK Technique | ML System Context | Detection |
|-----------------|-------------------|-----------|
| T1530 Data from Cloud Storage Object | S3 model weights exfiltration | CloudTrail GetObject on model bucket |
| T1552.005 Cloud Instance Metadata | EC2/GCE metadata service for training credential theft | IMDS access log + restrict to IMDSv2 |
| T1078.004 Cloud Accounts | Compromised SageMaker / Vertex AI / Azure ML service accounts | IAM anomaly detection |
| T1195 Supply Chain Compromise | Poisoned PyPI package injected into training pipeline | SBOM diff + dep pinning |
| T1048 Exfiltration Over Alternative Protocol | Exfiltrate model weights via DNS or openssl-encrypted channel | DNS anomaly + data volume baseline |
| T1119 Automated Collection | Automated inference API queries for model extraction | API rate anomaly detection |
