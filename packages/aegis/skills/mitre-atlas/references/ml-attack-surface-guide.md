# ML Attack Surface Guide

Use this reference during Phase 2 to characterise the AI/ML attack surface
before designing deception or detection assets.

## ML System Zones

| Zone | Components | Deception Primitives |
|------|------------|---------------------|
| Training Data Pipeline | Data ingestion, labelling, storage | Canary samples in training sets — fire if model reproduces them |
| Model Registry | Stored weights, versioned checkpoints | Honeypot model version — access logged |
| Inference API | Public or internal API endpoint | Canary queries — specific inputs that trigger logging |
| Feature Store | Feature engineering, real-time features | Fake features — access fires alert |
| ML Credentials | API keys, service accounts for ML platforms | Honeytoken API keys for Hugging Face, OpenAI, Vertex AI |
| Model Supply Chain | Pre-trained models, fine-tuning datasets | Canary weights — detectable fingerprints in model output |

## Deception for ML Systems

**Canary training samples:** Inject a small number of uniquely identifiable
data points into training sets. If a model inversion attack extracts training
data, the canary samples appear in the extracted set — confirming the attack.

**Honeypot model endpoints:** Deploy a slightly degraded model version with
access logging. Any API query to the honeypot endpoint is a confirmed reconnaissance signal.

**Honeytoken ML credentials:** Fake API keys for ML platforms (Hugging Face,
OpenAI, Vertex AI, AWS SageMaker). Any use of these keys fires immediately —
the adversary has stolen credentials from the environment.

**Canary inference queries:** Register specific input strings. If these strings
appear in inference logs, the model is being probed for membership inference.

## Assessment Questions

1. Does the organisation train custom models? → risk of training data poisoning
2. Are model weights stored and versioned? → risk of weight theft
3. Is there a public or partner-facing inference API? → risk of model inversion
4. Are ML platform credentials in code repos or CI/CD? → honeytoken opportunity
5. Does the organisation use pre-trained models from public sources? → supply chain risk
