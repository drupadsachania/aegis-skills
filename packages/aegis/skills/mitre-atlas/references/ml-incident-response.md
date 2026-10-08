# ML Incident Response — Reference

Use during Phase 5 when an ML security incident has been detected. Covers containment,
investigation, and recovery for the most common ATLAS attack scenarios.

## ML Incident Classification

| Incident Type | Detection Signal | ATLAS Technique | Severity |
|---------------|-----------------|-----------------|----------|
| Training data poisoning confirmed | Canary sample appears in model output; accuracy degradation on clean test set | AML.T0020 | Critical |
| Model extraction in progress | API rate anomaly; canary inference query triggered | AML.T0035 | High |
| Model inversion attack | Repeated queries from same source; training data identified in API responses | AML.T0040 | High |
| ML credential compromise | Honeytoken API key triggered (Vertex AI, SageMaker, Hugging Face, OpenAI) | AML.T0012 | Critical |
| Model backdoor discovered | Model performance differs on triggered vs. non-triggered inputs | AML.T0018 | Critical |
| Adversarial example campaign | Production model confidence drops; evasion rate increases | AML.T0031 | Medium |
| Supply chain compromise | SBOM diff shows unexpected dependency; training pipeline compromised on linux host | AML.T0019 | Critical |

## Incident Response Playbooks

### Playbook 1: Training Data Poisoning (AML.T0020)

**Trigger:** Canary sample appears in model outputs, or accuracy unexpectedly drops on clean validation set.

```
CONTAIN:
1. Halt all pending training runs immediately
2. Quarantine training data source (suspend S3 bucket write access; freeze apache data pipeline)
3. Snapshot current model weights for forensic analysis

INVESTIGATE:
4. Compare training data checksums against known-good baseline
5. Identify timestamp range of injected samples — query S3 access logs for write operations
6. Run canary sample detection: `python canary_check.py --model ./model.pkl --canaries canaries.json`
7. Check SBOM diff for malicious package added to training pipeline

RECOVER:
8. Roll back training data to last known-good snapshot (S3 versioning)
9. Re-train model from clean dataset with verified hashes
10. Run full canary sample suite on retrained model before promoting to production
11. Update incident report with T1565.001 (Data Manipulation) ATT&CK mapping
```

### Playbook 2: ML Credential Compromise (AML.T0012)

**Trigger:** Honeytoken API key used (Vertex AI, SageMaker, Hugging Face, OpenAI), or legitimate API key appears in SIEM from unexpected IP.

```
CONTAIN (within 15 minutes):
1. Revoke compromised API key immediately across all ML platforms:
   - Vertex AI: gcloud iam service-accounts keys delete <KEY_ID>
   - SageMaker: aws iam delete-access-key --access-key-id <KEY_ID>
   - Hugging Face: curl -X DELETE https://huggingface.co/api/orgs/ORG/tokens/TOKEN_NAME
   - OpenAI: Platform → API Keys → Revoke

2. Rotate ALL sibling credentials (same service account family)
3. Block source IP at nginx / API gateway level

INVESTIGATE:
4. Enumerate all API calls made with compromised credential — CloudTrail / audit log
5. Check if model weights were downloaded (S3 GetObject on model bucket)
6. Check if any training jobs were started (check for AML.T0020 follow-on)
7. Determine exfiltration path (T1537 Transfer to Cloud, T1041 Exfiltration over C2)
8. Identify initial compromise vector — git repo secret exposure, phishing, linux credential theft

RECOVER:
9. Issue new credentials with least-privilege scoping
10. Store in HashiCorp Vault; enable dynamic secret rotation
11. Deploy new honeytoken for same platform to maintain detection coverage
```

### Playbook 3: Model Extraction (AML.T0035)

**Trigger:** API rate anomaly; canary inference query triggered; unusually consistent query patterns from one source.

```
CONTAIN:
1. Block source IP/ASN at nginx WAF layer
2. Enable aggressive rate limiting: 10 req/min per IP
3. Enable output perturbation: add ε=0.01 noise to all confidence scores

INVESTIGATE:
4. Extract query log for source IP — how many queries, what input distribution?
5. Estimate extraction progress: N_queries × model_size_proxy → coverage estimate
6. Check if queries target specific decision boundaries (sign of active learning attack)
7. ATT&CK mapping: T1119 Automated Collection → T1048 Exfiltration

RECOVER:
8. Embed model watermark in newly promoted model version
9. File IP block at perimeter (cisco ASA / fortinet fortigate / paloaltonetworks PAN-OS)
10. If extraction near-complete: consider architectural changes (larger output perturbation, ensemble outputs)
```

### Playbook 4: Model Backdoor (AML.T0018)

**Trigger:** Model behaves differently when trigger pattern present; abnormal behaviour on specific input categories.

```
CONTAIN:
1. Immediately roll back inference API to previous model version
2. Quarantine affected model version in registry (mark as COMPROMISED)
3. Alert all consumers of the model — cease using predictions

INVESTIGATE:
4. Compare model weights between compromised and known-good version (diff sha256 hashes)
5. Run trigger-pattern analysis: test known adversarial trigger patterns against model
6. Inspect training pipeline git history for unauthorised changes — check linux runner logs
7. Inspect model registry for suspicious uploads from non-approved principals

RECOVER:
8. Re-train from earliest known-clean training data snapshot
9. Implement model signing (GPG / openssl signature) before registry push
10. Add training pipeline integrity check as CI gate
```

## Forensic Evidence Preservation

For any ML incident, preserve the following before remediation:

| Artefact | Location | Preservation Method |
|----------|----------|---------------------|
| Model weights (compromised) | MLflow / S3 model bucket | S3 Object Lock copy to forensic bucket |
| Training data at time of incident | S3 training bucket | S3 versioned snapshot |
| API query logs (nginx access.log) | /var/log/nginx/access.log | Copy to SIEM + S3 |
| CloudTrail logs (S3, SageMaker, Vertex AI) | CloudTrail S3 bucket | Verify log integrity hashes |
| linux training host memory dump | /proc/PID/mem of training process | Volatile memory capture (LiME kernel module) |
| Container image used for training | Docker registry | docker save + sha256 hash |
| Git commit history of training code | GitHub / GitLab | git log --all with GPG signature check |

## ATT&CK Technique Coverage — ML Incident Response

T1078 T1078.004 T1119 T1195 T1195.001 T1530 T1537 T1540 T1548 T1552 T1552.005
T1562 T1565 T1565.001 T1588 T1588.002 T1048 T1041 T1499 T1602 T1213
T1040 T1102 T1059 T1059.006 T1203 T1600 T1119 T1074 T1574 T1574.001
