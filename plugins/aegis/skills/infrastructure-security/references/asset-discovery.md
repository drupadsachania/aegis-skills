# Asset Discovery — Reference

Use during Phase 1 to build a comprehensive, tiered asset inventory as the foundation for all subsequent infrastructure security work.

## Asset Tier Classification

| Tier | Description | Examples | Patch SLA |
|------|-------------|---------|-----------|
| Tier 1 — Crown Jewel | Compromise leads to full domain or data breach | Domain Controllers, PAM servers, HSMs, Backup infrastructure | 24 hours (critical CVEs) |
| Tier 2 — Business Critical | Direct revenue or compliance impact | Production databases, payment systems, HR platforms | 72 hours |
| Tier 3 — Standard | Normal business operations | Application servers, internal tools, mid-tier services | 14 days |
| Tier 4 — Non-critical | Limited business impact | Dev/test environments, spare capacity | 30 days |

## Discovery Methods

| Method | Command / Tool | Scope |
|--------|---------------|-------|
| Active Directory | `Get-ADComputer -Filter * -Properties *` | Windows domain-joined assets |
| Cloud CLI (AWS) | `aws ec2 describe-instances --output table` | AWS EC2 workloads |
| Cloud CLI (Azure) | `az resource list --output table` | All Azure resources |
| Cloud CLI (GCP) | `gcloud compute instances list` | GCP compute |
| Network scan | `nmap -sV -p 22,80,443,3389,445 10.0.0.0/8` | Active network hosts |
| Container registry | `kubectl get pods --all-namespaces` | Kubernetes workloads |
| CMDB pull | ServiceNow / Lansweeper REST API | Authoritative asset list |

## Asset Inventory Output Format

```
| Asset ID | Hostname | IP | OS | Tier | Owner | Cloud Provider | Region | Last Seen |
```

## Discovery Validation

After initial discovery, validate completeness by:
1. Cross-referencing AD computer objects against network scan results
2. Comparing CMDB records with cloud provider inventory
3. Checking for orphaned cloud resources (no owner tag, no recent activity)
4. Identifying rogue/shadow IT assets not in CMDB

## Coverage Gaps to Investigate

- Assets with no OS details (potentially unmanaged devices)
- IP addresses with no hostname resolution (potential shadow IT)
- Cloud resources with missing mandatory tags (`Owner`, `Environment`, `CostCentre`)
- Containers without image provenance or SBOM
