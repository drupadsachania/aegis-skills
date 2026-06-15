# ML Defense Controls — Reference

Use during Phase 4 to select and implement technical controls that defend the AI/ML
system against ATLAS-mapped threats identified in Phase 3.

## Defense Control Categories

### 1. Training Data Integrity

| Control | Implementation | Threat Mitigated | Detection Mechanism |
|---------|---------------|-----------------|---------------------|
| Canary samples | Inject ≥50 uniquely-identifiable data points; hash all training samples | AML.T0020 Poison Training Data | Monitor model output on canary inputs post-training |
| Data provenance tracking | Hash all training data files (SHA-256); store in apache-style access log | AML.T0019 Publish Poisoned Data | File integrity monitoring on training S3 bucket |
| Differential privacy | Apply ε-DP (ε ≤ 1.0) via TensorFlow Privacy or PyTorch Opacus | AML.T0040 Model Inversion | Statistical audit of model outputs |
| SBOM for training deps | Generate CycloneDX SBOM for all Python/conda packages on linux training host | AML.T0019 Supply Chain | Dep diff alert on CI pipeline |
| Training data checksums | Verify SHA-256 checksums of all training batches before training begins | AML.T0020 | Hash mismatch alert in training orchestrator |

### 2. Model Registry Protection

| Control | Implementation | Threat Mitigated |
|---------|---------------|-----------------|
| Signed model artifacts | GPG/openssl sign all model weights before publishing to registry | AML.T0018 Backdoor ML Model |
| Immutable registry | Versioned, write-once model storage (S3 Object Lock / MLflow artifact locking) | AML.T0018 |
| Registry access logging | CloudTrail / audit log on all model.download() calls in Hugging Face or MLflow | AML.T0035 Model Extraction |
| Honeypot model version | Publish deliberately degraded model as a canary — any access to this version fires | AML.T0035 |
| Model fingerprinting | Embed unique watermark in model outputs to detect unauthorized copies | AML.T0029 Exfiltrate ML Model |

### 3. Inference API Hardening

| Control | Tool / Implementation | Threat Mitigated | ATT&CK Analogue |
|---------|----------------------|-----------------|----------------|
| Rate limiting | nginx rate_limit_zone + burst control; or API gateway with per-consumer quotas | AML.T0035 Model Extraction | T1499 |
| Query logging with anomaly detection | Log all inference requests; baseline per-client query volumes; alert on deviations | AML.T0035, AML.T0040 | T1119 |
| Output perturbation | Add calibrated noise to high-confidence outputs (reduces inversion accuracy by ≥70%) | AML.T0040 Model Inversion | T1040 |
| canary inference queries | Register specific input strings; fire alert if received at inference endpoint | AML.T0035, AML.T0031 | T1102 |
| TLS certificate pinning | Client certificate required for high-privilege inference; openssl client auth | AML.T0013 | T1599 |
| Input validation | Schema validation + perturbation detection (L-inf norm check) for adversarial inputs | AML.T0043, AML.T0031 | T1203 |

### 4. ML Credential Security

| Control | Implementation | Threat Mitigated | ATT&CK Analogue |
|---------|---------------|-----------------|----------------|
| Honeytoken API keys | Create fake API keys for Vertex AI, SageMaker, Hugging Face, OpenAI; alert on any use | AML.T0012 | T1078 |
| Short-lived credentials | Rotate ML platform API keys every 24h; use OIDC federation where possible | AML.T0012 | T1552 |
| Vault for ML secrets | Store all Vertex AI, SageMaker, Hugging Face tokens in HashiCorp Vault on linux | AML.T0012 | T1552.001 |
| Credential scanning | Run detect-secrets / trufflehog on all Git repos; block commits containing API keys | AML.T0012 | T1195 |
| Least-privilege IAM | ML training role: read training bucket only; inference role: invoke model endpoint only | AML.T0012 | T1548 |

### 5. Supply Chain Controls

| Control | Implementation | ATLAS Threat | ATT&CK Analogue |
|---------|---------------|-------------|----------------|
| Pinned dependencies | requirements.txt with exact hashes (`pip install --require-hashes`) | AML.T0019 | T1195 |
| Private PyPI mirror | Internal apache-served PyPI mirror; allowlist of approved packages | AML.T0019 | T1195.001 |
| Pre-trained model verification | Verify SHA-256 hash of downloaded Hugging Face / PyTorch model before use | AML.T0002 | T1588 |
| CI pipeline isolation | Training jobs run in ephemeral linux containers; no internet egress during training | AML.T0015 | T1562 |
| SBOM generation + diff | CycloneDX SBOM on every training image build; alert on unexpected dep additions | AML.T0019 | T1195 |

## Control Implementation Priority

```
Priority 1 — Immediate (week 1):
├── Honeytoken ML credentials for all ML platforms
├── nginx rate limiting on inference API
├── Canary samples in training data (inject before next training run)
└── Registry access logging (CloudTrail / MLflow audit log)

Priority 2 — Short-term (month 1):
├── Differential privacy (ε-DP) for sensitive model training
├── Signed model artifacts (openssl GPG signing)
├── Canary inference query registration
└── Dependency pinning + private PyPI mirror

Priority 3 — Medium-term (quarter 1):
├── Output perturbation for high-risk inference APIs
├── SBOM generation in CI/CD pipeline
└── Input adversarial perturbation detection
```

## Security Metrics for ML Controls

| Metric | Target | Measurement Frequency |
|--------|--------|-----------------------|
| Honeytoken API key trigger rate | 0 (any trigger = incident) | Real-time |
| Canary sample survival rate in training | 100% (canaries must survive to training) | Per training run |
| Inference API query rate anomalies | < 5 alerts / week (tuned baseline) | Daily |
| Model registry access by non-approved principals | 0 | Daily |
| Dep pin compliance | 100% of training Docker images | Per build |
| Time-to-detect (TTD) for model extraction attempt | < 30 minutes | Per incident |
