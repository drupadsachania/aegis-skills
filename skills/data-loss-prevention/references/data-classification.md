# Data Classification & Discovery — Reference

Use during Phase 1 to build the classification scheme and discover where sensitive data
actually lives. Every downstream enforcement layer references these labels — get this wrong
and the whole programme mislabels or over-blocks.

## 1. Classification Scheme

| Label | Definition | Examples | Default Handling |
|-------|-----------|----------|------------------|
| Public | Cleared for public release | Marketing, published docs | No controls |
| Internal | Default for business data | Internal wikis, non-sensitive email | No external share without review |
| Confidential | Harm if disclosed | Contracts, source code, roadmaps | Encrypt in transit; block unmanaged share |
| Restricted | Severe/regulatory harm | PII, PHI, PCI (PAN), secrets, credentials | Encrypt at rest+transit; block egress by default |

Keep it to 3–4 tiers. More tiers = users misclassify and controls become inconsistent.

## 2. Sensitive Data Types & Detection Patterns

| Data Type | Detection Method | Example Pattern |
|-----------|-----------------|-----------------|
| Credit card (PAN) | Regex + Luhn checksum | `\b(?:\d[ -]*?){13,19}\b` + Luhn validation |
| SSN (US) | Regex + context | `\b\d{3}-\d{2}-\d{4}\b` near "SSN"/"social" |
| API keys / secrets | Entropy + prefix match | `AKIA[0-9A-Z]{16}`, `sk-`, `ghp_`, high-entropy strings |
| PHI (health) | Dictionary + ICD codes | Diagnosis terms, ICD-10 codes near patient identifiers |
| Source code | File type + keyword | Proprietary module names, copyright headers |
| Bank account / IBAN | Regex + country checksum | `[A-Z]{2}\d{2}[A-Z0-9]{11,30}` + mod-97 |

Prefer **exact data match (EDM)** and **document fingerprinting** over pure regex for
structured databases and known documents — regex alone produces high false-positive rates.

## 3. Discovery — Find the Data First

```
Discovery order (data at rest → in motion → in use):
  1. Structured stores  — databases, data warehouses (scan schemas + sample rows via EDM)
  2. Unstructured stores— file shares, SharePoint, object storage (fingerprint + pattern)
  3. Endpoints          — local copies staged by users (agent scan)
  4. SaaS               — Google Drive, M365, Box, Salesforce (API-based DSPM scan)
  5. Shadow data        — forgotten buckets, dev copies of prod data, backups

Tooling:
  Microsoft Purview / Google DLP API / AWS Macie   — cloud + SaaS discovery
  Open-source: Nightfall patterns, gitleaks/trufflehog for secrets in repos
  DSPM platforms (Cyera, Sentra, Varonis)          — map data + access + risk
```

## 4. Labelling & Governance

```
Labelling approaches:
  Automatic  — classifier applies label on match (best coverage; tune for FPs)
  User-driven— author selects sensitivity label (Purview MIP / Google labels)
  Inherited  — child inherits parent container's label

Persist labels as metadata that travels with the file (MIP labels, x-amz-tagging)
so downstream layers (network, endpoint, cloud) can enforce on the label, not re-scan.

Governance:
  - Data owner assigned per data domain (accountable for classification accuracy)
  - Quarterly re-scan; measure % of estate classified and label accuracy (sample audit)
  - Retention + minimisation: the cheapest DLP is deleting data you don't need
```

## 5. Regulatory Mapping

| Regulation | Data In Scope | Classification Driver |
|-----------|--------------|----------------------|
| GDPR | EU personal data | Restricted; supports data-subject rights |
| HIPAA | PHI | Restricted; encryption + access logging |
| PCI DSS | Cardholder data (PAN) | Restricted; tokenise/mask; never store CVV |
| SOX | Financial reporting data | Confidential; integrity + audit trail |
| CCPA/CPRA | California personal info | Restricted; sale/share opt-out |

## Output of Phase 1

A data catalogue: for each sensitive data type — where it lives (stores), volume, owner,
label, and regulation. This feeds the enforcement policies in Phases 2–5.

## ATT&CK Mapping
T1213 Data from Information Repositories · T1530 Data from Cloud Storage · T1005 Data from Local System · T1039 Data from Network Shared Drive
