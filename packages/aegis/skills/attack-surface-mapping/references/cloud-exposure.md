# Cloud Exposure — Reference

Use during Phase 3 to identify cloud misconfigurations and publicly accessible cloud resources.

## AWS Exposure Checks

```bash
# List all public S3 buckets
aws s3api list-buckets --query "Buckets[*].Name" --output text | \
  xargs -I {} aws s3api get-bucket-acl --bucket {} 2>/dev/null

# Find EC2 instances with public IPs
aws ec2 describe-instances \
  --query "Reservations[*].Instances[?PublicIpAddress!=null].{Name:Tags[?Key=='Name']|[0].Value,IP:PublicIpAddress,SG:SecurityGroups}" \
  --output table

# Find security groups with 0.0.0.0/0 inbound
aws ec2 describe-security-groups \
  --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp=='0.0.0.0/0']]].{ID:GroupId,Name:GroupName}" \
  --output table

# Check for public RDS instances
aws rds describe-db-instances \
  --query "DBInstances[?PubliclyAccessible==\`true\`].{ID:DBInstanceIdentifier,Engine:Engine}" \
  --output table
```

## Azure Exposure Checks

```bash
# List NSGs with any-source inbound rules
az network nsg list --query "[*].{Name:name,RG:resourceGroup}" -o table

# Find VMs with public IPs
az vm list-ip-addresses --query "[*].{VM:virtualMachine.name,PublicIP:virtualMachine.network.publicIpAddresses[0].ipAddress}" -o table

# Check storage accounts with public access
az storage account list --query "[?allowBlobPublicAccess!=false].{Name:name,RG:resourceGroup}" -o table
```

## CSPM Tool Table

| Tool | Cloud Support | Key Capabilities | Cost |
|------|-------------|-----------------|------|
| Prowler | AWS, Azure, GCP | CIS Benchmark, GDPR, PCI DSS checks | Open source |
| ScoutSuite | AWS, Azure, GCP, OCI | Multi-cloud posture review | Open source |
| Checkov | Terraform, CloudFormation, K8s | IaC misconfiguration scanning | Open source |
| AWS SecurityHub | AWS | Aggregated findings from GuardDuty, Inspector, Config | AWS native |
| Microsoft Defender for Cloud | Azure, multi-cloud | Secure Score, recommendations | Azure native |
| Wiz | AWS, Azure, GCP, OCI | Attack path analysis, CSPM, CWPP | Commercial |

## Critical Misconfiguration Patterns Table

| Misconfiguration | ATT&CK Technique | Risk | Detection Check |
|-----------------|-----------------|------|----------------|
| Public S3 bucket with sensitive data | T1530 Data from Cloud Storage | Critical | `aws s3api get-bucket-policy-status --bucket <name>` |
| IMDSv1 enabled (no token required) | T1552.005 Cloud Instance Metadata | High | `aws ec2 describe-instances` check `HttpTokens` |
| IAM role with `*:*` permissions | T1078.004 Cloud Accounts | Critical | IAM Access Analyzer, Prowler check IAM.1 |
| Exposed database port (3306/5432) | T1190 Exploit Public-Facing App | Critical | Security group review |
| CloudTrail logging disabled | T1562.008 Disable Cloud Logs | High | `aws cloudtrail describe-trails` |
| MFA not enforced for IAM users | T1078 Valid Accounts | High | `aws iam get-account-summary` MFADevicesInUse |
| Default VPC in use | Lateral movement risk | Medium | `aws ec2 describe-vpcs --filter Name=isDefault,Values=true` |
