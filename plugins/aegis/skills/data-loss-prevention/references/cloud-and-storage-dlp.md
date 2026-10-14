# Cloud & Object Storage / DSPM — Reference

Use during Phase 5 to control data leaving through cloud infrastructure and object storage —
where the largest breaches happen (public buckets, over-permissive access, snapshot sharing).
Covers AWS/Azure/GCP storage, DSPM, and cloud-native exfiltration paths.

## 1. Object Storage Exposure Controls

| Cloud | Exposure Risk | Control |
|-------|--------------|---------|
| AWS S3 | Public bucket / ACL | Enable Block Public Access (account + bucket); SCP to deny public ACLs |
| Azure Blob | Anonymous public access | Disable `allowBlobPublicAccess`; private endpoints |
| GCP Cloud Storage | `allUsers` / `allAuthenticatedUsers` IAM | Enforce uniform bucket-level access; org policy deny public |

```
Baseline hardening:
  [ ] Default-deny public access at the org/account level (not per-bucket)
  [ ] Encrypt at rest with CMK; deny unencrypted PutObject via bucket policy
  [ ] Enforce TLS-only access (aws:SecureTransport / supportsHttpsTrafficOnly)
  [ ] Enable object-level logging (S3 access logs / CloudTrail data events)
  [ ] Versioning + Object Lock on Restricted buckets (anti-tamper/ransomware)
```

## 2. Cloud-Native Exfiltration Paths (Often Missed)

| Path | Technique | Control |
|------|-----------|---------|
| Copy data to attacker-controlled account | T1537 Transfer Data to Cloud Account | Deny cross-account share; SCP allowlist trusted accounts; alert on external share |
| Public snapshot / AMI sharing | T1537 | Deny public EBS/RDS snapshot sharing; scan for public snapshots |
| Presigned URL abuse | T1567.002 | Short expiry; log generation; alert on bulk presign |
| Cross-region replication to rogue bucket | T1537 | Restrict replication destinations to approved accounts |
| Data via compute (exfil from EC2/function) | T1041 / T1048 | Egress controls on VPC; VPC endpoints; no public IPs on data-tier |
| Credential-based bulk download | T1530 | Anomaly detection on GetObject volume; IMDSv2 to limit cred theft |

## 3. DSPM — Data Security Posture Management

```
DSPM continuously answers: where is sensitive data, who can access it, how is it exposed?

  1. Discover  — scan all cloud stores + SaaS for sensitive data (agentless, API-based)
  2. Classify  — apply the same Phase-1 labels to cloud data at rest
  3. Map access— resolve effective permissions (who/what can reach each data store)
  4. Find risk — public exposure, over-privileged roles, unencrypted, stale sensitive data
  5. Prioritise— rank by (sensitivity × exposure × access breadth)
  6. Remediate — auto-ticket / auto-remediate public + over-permissive findings

Platforms: AWS Macie, Microsoft Purview, Google DLP/SDP, Cyera, Sentra, Wiz DSPM, Varonis.
```

## 4. Access & Identity Controls for Data

```
Data exfil is usually an access problem:
  [ ] Least-privilege on data stores; no wildcard s3:* / storage.admin on Restricted
  [ ] Just-in-time + approval for bulk-export / admin data roles
  [ ] Separate roles for read vs. bulk-export; alert on bulk-export role use
  [ ] Service accounts scoped to specific buckets; rotate keys; prefer workload identity
  [ ] IAM Access Analyzer / equivalent to surface external + public data access
```

## 5. Monitoring & Detection Queries

```
CloudTrail / cloud audit signals to alert on:
  - PutBucketAcl / PutBucketPolicy making a bucket public
  - ModifySnapshotAttribute / ModifyImageAttribute adding "all" (public share)
  - Cross-account GetObject or replication to an unrecognised account
  - Spike in GetObject volume vs. baseline for a principal (bulk download)
  - New presigned-URL generation at scale
  - Sensitive bucket accessed from a new region / new IP / new principal

Example (bulk download):
  source=cloudtrail eventName=GetObject
  | stats sum(bytesTransferred) as vol by userIdentity.arn, bucket
  | where vol > baseline*3
```

## ATT&CK Mapping
T1530 Data from Cloud Storage · T1537 Transfer Data to Cloud Account · T1567.002 Exfil to Cloud Storage · T1580 Cloud Infrastructure Discovery · T1552.005 Cloud Instance Metadata · T1078.004 Cloud Accounts · T1619 Cloud Storage Object Discovery
