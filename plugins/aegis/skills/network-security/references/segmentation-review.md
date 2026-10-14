# Segmentation Review — Reference

Use during Phase 2 to assess whether network segments correctly enforce least-privilege access between zones.

## Segmentation Principles

Effective segmentation limits lateral movement (T1021) and discovery (T1046, T1018) by requiring explicit trust between zones. Every segment crossing should be policy-controlled and logged.

## VLAN and Zone Review Checklist

| Control | Expected State | Assessment Method | ATT&CK Technique Mitigated |
|---------|---------------|-------------------|---------------------------|
| Inter-VLAN routing restricted | Only required ports between VLANs | Firewall rule review + test traffic | T1021 Remote Services |
| IT/OT boundary firewall | Unidirectional or tightly filtered | Firewall rule export review | T1021, T1566 |
| DMZ → Internal blocked | DMZ cannot initiate sessions to internal | ACL review, penetration test | T1190, T1133 |
| User subnet → Server subnet | Only approved application ports | Policy review + flow data | T1021.002 SMB, T1021.006 WinRM |
| Jump host / PAM enforced | All admin access routes via privileged access workstation | Firewall log review | T1078 Valid Accounts |
| Crown jewel isolation | Domain controllers, HSMs, backup servers in dedicated segment | Network diagram validation | T1003, T1490 |

## Cloud VPC Segmentation Review

```
AWS checklist:
[ ] Security groups — no 0.0.0.0/0 inbound on SSH/RDP
[ ] NACLs applied at subnet level for defence-in-depth
[ ] VPC Flow Logs enabled in all VPCs
[ ] Transit Gateway attachments reviewed — no unexpected cross-account routes
[ ] PrivateLink used for AWS service access (no public endpoints)

Azure checklist:
[ ] NSG rules reviewed — deny-all default applied
[ ] Azure Firewall or NVA on hub-spoke boundary
[ ] No peering to untrusted subscriptions
[ ] Private Endpoints configured for PaaS services
```

## IT/OT Boundary Controls

For environments with operational technology:

| Boundary | Required Control | Acceptable Exception |
|----------|-----------------|----------------------|
| IT → OT | Industrial DMZ (IDMZ) with one-way data diode or firewall | Approved historian replication only |
| OT → Internet | Blocked at perimeter | Vendor remote access via jump host with MFA |
| Engineering workstations | Isolated VLAN, no internet | Software update via approved proxy |
| SCADA/HMI | Air-gapped or strict whitelist | — |

## Segmentation Gap Register Template

| Finding | Source Zone | Destination Zone | Port/Protocol | Risk | Recommended Action |
|---------|-------------|-----------------|---------------|------|--------------------|
| User VLAN can reach DC on all ports | Users (10.1.0.0/24) | DC (10.0.0.10) | All | High | Restrict to 88,389,445,3268 only |
