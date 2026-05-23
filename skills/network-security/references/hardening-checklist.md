# Network Hardening Checklist — Reference

Use during Phase 4 to prioritise and implement network hardening controls. Tier 1 controls are mandatory; Tier 2 and Tier 3 are risk-based.

## Tier 1 — Critical Controls (Implement Immediately)

| Control | Implementation Notes | ATT&CK Technique Mitigated | Complexity |
|---------|---------------------|---------------------------|-----------|
| Disable SMBv1 | Group Policy: `Set-SmbServerConfiguration -EnableSMB1Protocol $false` | T1021.002 | Low |
| Block LLMNR/mDNS | GPO: Computer Config → Admin Templates → DNS Client → Turn off multicast name resolution | T1557.001 LLMNR Poisoning | Low |
| Enforce NTLMv2 minimum | GPO: Security Options → LAN Manager authentication level → NTLMv2 only | T1557 | Low |
| Firewall default-deny | All network firewalls set to implicit deny-all; only approved rules permitted | T1021, T1046 | Medium |
| Disable Telnet/FTP | Remove from all network devices; replace with SSH/SFTP | T1021.004 | Low |
| Enable VPC Flow Logs | All cloud VPCs; retain 90+ days in SIEM | T1040 | Low |
| Patch network devices | Monthly patch cycle for routers, switches, firewalls; out-of-band management | T1190 | Medium |

## Tier 2 — High-Value Controls (Implement Within 30 Days)

| Control | Implementation Notes | ATT&CK Technique Mitigated | Complexity |
|---------|---------------------|---------------------------|-----------|
| Network Access Control (NAC) | 802.1X port authentication; quarantine VLAN for non-compliant devices | T1200 Hardware Additions | High |
| DNS RPZ (Response Policy Zones) | Block known-malicious domains at resolver; subscribe to threat intel feed | T1071.004 | Medium |
| East-west micro-segmentation | Zero-trust microsegmentation for crown jewel subnets (VMware NSX or equivalent) | T1021 | High |
| NetFlow export to SIEM | All perimeter and core switches/routers export flow data; baseline 14 days | T1040 | Medium |
| BGP route filtering | Implement prefix-list and AS-path filters on all BGP peers | T1599 Network Boundary Bridging | Medium |
| Disable unused switch ports | Access ports not in use set to unused VLAN and shutdown | T1200 | Low |

## Tier 3 — Defence-in-Depth Controls (Implement Within 90 Days)

| Control | Implementation Notes | ATT&CK Technique Mitigated | Complexity |
|---------|---------------------|---------------------------|-----------|
| Deception honeypots | Deploy network honeypots in user and server VLANs (e.g., Canarytokens, Thinkst Canary) | T1046, T1021 | Medium |
| Network DLP | Inspect and block sensitive data exfiltration over HTTP/S and DNS | T1048 Exfiltration | High |
| IPv6 security controls | Disable IPv6 where unused; filter RA messages; deploy IPv6 FW rules | T1049 | Medium |
| Out-of-band management network | Separate management VLAN/network for all infrastructure devices; no user access | T1557 | High |
| TLS inspection | Decrypt and inspect outbound TLS for malware/C2 detection | T1071.001 | High |
| DNSSEC validation | Enable DNSSEC validation on recursive resolvers | T1557.002 ARP Cache Poisoning | Medium |

## Compliance Mapping

| Control Tier | NIST CSF Function | CIS Control | PCI DSS Requirement |
|-------------|-------------------|-------------|---------------------|
| Tier 1 | Protect (PR.AC) | CIS 12, 13 | Req 1, 2 |
| Tier 2 | Protect + Detect (DE.CM) | CIS 12, 13, 14 | Req 1, 10 |
| Tier 3 | Detect + Respond (RS.AN) | CIS 14, 16 | Req 10, 11 |
