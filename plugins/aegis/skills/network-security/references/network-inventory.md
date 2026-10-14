# Network Inventory — Reference

Use during Phase 1 to enumerate all network assets before segmentation review or hardening work.

## Discovery Methods

| Method | Tool | Use Case | ATT&CK Relevance |
|--------|------|----------|------------------|
| Active scan | nmap `-sn -PE` | Ping sweep for live hosts | T1046 Network Service Discovery |
| Port scan | nmap `-sV -sC -p-` | Service/version enumeration | T1046 |
| Passive ARP | arp-scan, Wireshark | Layer-2 host discovery without noise | T1040 Network Sniffing |
| Cloud inventory | AWS CLI `ec2 describe-instances`, Azure `az vm list` | Cloud asset enumeration | T1580 Cloud Infrastructure Discovery |
| AD query | `Get-ADComputer -Filter *` | Active Directory computer objects | T1018 Remote System Discovery |
| DNS zone transfer | `dig axfr @nameserver domain` | Enumerate DNS records | T1590 Gather Victim Network Info |
| CMDB export | ServiceNow / Lansweeper API | Authoritative asset list baseline | — |

## Active Discovery — Nmap Commands

```bash
# Ping sweep — discover live hosts
nmap -sn 10.0.0.0/8 -oG live-hosts.gnmap

# Service and version scan on discovered hosts
nmap -sV -sC -O -T4 -iL live-hosts.txt -oX services.xml

# UDP top ports (slow — restrict to critical subnets)
nmap -sU --top-ports 20 10.0.1.0/24
```

## Cloud Asset Discovery

```bash
# AWS — list EC2 instances with tags
aws ec2 describe-instances --query \
  "Reservations[*].Instances[*].{IP:PrivateIpAddress,Name:Tags[?Key=='Name']|[0].Value,State:State.Name}"

# Azure — list all VMs
az vm list --show-details --query "[*].{Name:name,IP:privateIps,State:powerState}"
```

## Asset Inventory Output Table

| IP Address | Hostname | OS | Open Ports | Role | Business Owner | Criticality |
|------------|----------|----|------------|------|----------------|-------------|
| 10.0.1.10 | dc01.corp | Windows Server 2022 | 53,88,389,445 | Domain Controller | IT Ops | Critical |
| 10.0.2.50 | web-prod-01 | Ubuntu 22.04 | 80,443 | Web Server | App Team | High |

## IP Range Classification

Segment all discovered ranges into:
1. **Crown jewel subnets** — contain Tier 1 assets (DCs, PAM, HSMs)
2. **Production subnets** — servers, databases
3. **User subnets** — workstations, BYOD
4. **DMZ/perimeter** — internet-facing services
5. **OT/ICS subnets** — operational technology (if applicable)
6. **Cloud VPCs** — per environment (prod/dev/staging)
