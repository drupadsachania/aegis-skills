# Attack Surface Taxonomy for Deception Engineering

Use this reference during Phase 1 to characterize zones accurately before any deception decision.

---

## Zone Profiles

### Zone 1 — Perimeter
**What lives here:** Edge firewalls, public-facing IPs, VPN concentrators, DNS resolvers, BGP routers.
**Attacker behaviour:** Mass scanning, credential stuffing, exploit attempts against known CVEs, VPN brute force.
**Deception value:** Low for internal intelligence. High for adversary TTP fingerprinting.
**Key question:** Are you trying to gather threat intel on internet-facing attackers, or detect internal breach? Perimeter deception serves the former only.
**ATT&CK techniques to calibrate against:** T1595 (Active Scanning), T1110 (Brute Force), T1190 (Exploit Public-Facing Application)

### Zone 2 — DMZ
**What lives here:** Reverse proxies, WAFs, mail gateways, jump hosts exposed to partners.
**Attacker behaviour:** Exploiting misconfigured services, stealing service credentials, pivoting inward.
**Deception value:** Medium. An attacker here has already bypassed perimeter — your signal improves.
**Key question:** What services here, if compromised, give the attacker an internal foothold?
**ATT&CK techniques:** T1133 (External Remote Services), T1021 (Remote Services), T1078 (Valid Accounts)

### Zone 3 — Internal Network / Lateral Movement Paths
**What lives here:** Internal VLANs, file servers, internal APIs, database servers, internal web apps.
**Attacker behaviour:** Network enumeration, SMB lateral movement, pass-the-hash, service discovery.
**Deception value:** High. An attacker here has confirmed breach. Every interaction is forensic gold.
**Key question:** What internal paths lead from initial access to crown jewels? Place deception on those paths.
**ATT&CK techniques:** T1046 (Network Service Scanning), T1021.002 (SMB/Windows Admin Shares), T1550 (Use Alternate Authentication Material)

### Zone 4 — Identity / Active Directory
**What lives here:** Domain controllers, LDAP, Kerberos infrastructure, service accounts, privileged groups.
**Attacker behaviour:** BloodHound enumeration, Kerberoasting, DCSync, pass-the-ticket, golden ticket.
**Deception value:** Very High. Identity abuse is the most common privilege escalation path.
**Deception primitives specific to this zone:**
- Fake service accounts with SPNs (Kerberoasting bait — monitor for TGS requests)
- Fake admin accounts in believable privileged groups
- Fake GPO entries pointing to honeypot UNC paths
- Honey credentials in SYSVOL scripts (legacy AD hygiene issue attackers actively look for)
**ATT&CK techniques:** T1558 (Steal or Forge Kerberos Tickets), T1087.002 (Domain Account Discovery), T1484 (Domain Policy Modification)

### Zone 5 — Endpoint / Workstation
**What lives here:** Developer laptops, finance workstations, engineering machines, executive endpoints.
**Attacker behaviour:** Credential harvesting, browser history/saved password enumeration, SSH config reading, .env file grepping, clipboard monitoring.
**Deception value:** High. Post-compromise enumeration on an endpoint always reveals what the attacker is looking for next.
**Deception primitives specific to this zone:**
- Fake .ssh/config entries pointing to honeypot IPs
- Fake .env / .aws/credentials files with honeytoken keys
- Fake password manager entries with monitored credentials
- Fake browser bookmark to an internal resource (monitored URL)
- Fake network share in Windows Explorer with a monitored UNC path
**Machine class prioritisation:** Developer > Finance > Executive > General staff (in order of attacker interest)
**ATT&CK techniques:** T1552 (Unsecured Credentials), T1083 (File and Directory Discovery), T1555 (Credentials from Password Stores)

### Zone 6 — Cloud / CSP
**What lives here:** IAM roles, S3/GCS/Blob storage, EC2/GCE/VMs, Lambda/Cloud Functions, secrets managers.
**Attacker behaviour:** Credential theft and reuse, IAM enumeration, S3 bucket listing, metadata service abuse (SSRF → IMDS), secrets manager scraping.
**Deception value:** Very High. Cloud credential honeytokens fire cross-environment — they alert even if the attacker exfiltrates the credential and uses it from an external IP.
**Deception primitives specific to this zone:**
- Fake IAM access keys embedded in code repos, .env files, CI/CD configs
- Fake S3 bucket names (typosquat your real buckets — monitor DNS/HTTP hits)
- Fake secrets in Secrets Manager / Vault with access logging enabled
- Fake IMDS credential responses (advanced — requires custom proxy)
**ATT&CK techniques:** T1552.005 (Cloud Instance Metadata API), T1530 (Data from Cloud Storage), T1078.004 (Cloud Accounts)

### Zone 7 — OT / IT Boundary
**What lives here:** Historian servers, HMI workstations, PLC jump hosts, data diodes, OT DMZ.
**Attacker behaviour:** IT-to-OT pivot via jump hosts, historian exploitation, HMI credential theft, protocol reconnaissance (Modbus, DNP3, OPC).
**Deception value:** Critical — but SAFETY FIRST, always.
**OT-specific constraints — non-negotiable:**
- Passive monitoring only on the OT side
- No interactive honeypots that accept write operations
- No deception assets that can be mistaken for actual PLCs or safety systems
- All OT deception design requires sign-off from OT engineering, not just security
- Latency and reliability of OT processes take absolute precedence over detection
**Recommended approach:** Fake IT-side jump host with honeypot credentials. Monitor for OT-protocol enumeration on the IT/OT boundary switch. Never place interactive deception inside the OT process network.
**ATT&CK ICS techniques:** T0886 (Remote Services), T0843 (Program Download), T0861 (Point & Tag Identification)

### Zone 8 — Data / IP Stores
**What lives here:** File shares, SharePoint/Confluence, code repositories (GitHub/GitLab/Bitbucket), design file directories, CAD/EDA tool vaults.
**Attacker behaviour:** Large-scale enumeration and staging for exfiltration, searching for high-value filenames, downloading IP assets.
**Deception value:** Very High for IP-intensive organisations (automotive, semiconductor, pharma).
**Deception primitives specific to this zone:**
- Fake design files with document-open callbacks (Canarytokens Word/PDF)
- Fake repository with realistic name, fake credentials embedded, clone-monitored
- Fake SharePoint/Confluence page with a honeytoken link
- Fake archive (ZIP/TAR) with embedded honeytoken that fires on extraction
**ATT&CK techniques:** T1213 (Data from Information Repositories), T1039 (Data from Network Shared Drive), T1567 (Exfiltration Over Web Service)

---

## Attack Surface Scoring Quick Reference

After characterising each zone, assign:

| Dimension | 1 (Low) | 2 (Medium) | 3 (High) |
|-----------|---------|------------|---------|
| Asset Sensitivity | Supporting | Operational | Crown Jewel |
| Threat Vector Exposure | Internet-edge only | Lateral path | Privileged access path |
| Attacker Dwell Likelihood | Low (noisy zone) | Medium | High (quiet zone) |

Sum the three scores (max 9). Feed into Phase 3 semantic matrix as the Attack Surface Score.

---

## Industry-Specific Notes

**Automotive suppliers (e.g., tier-1 like Visteon):**
Primary risk zones are Zone 7 (OT boundary — production line), Zone 8 (IP stores — ECU firmware, circuit designs), and Zone 4 (Identity — supply chain portal credentials). Calibrate deception density accordingly.

**Financial services:**
Primary risk zones are Zone 4 (Identity), Zone 6 (Cloud — trading infrastructure), Zone 3 (Internal — payment rails).

**Healthcare:**
Primary risk zones are Zone 8 (patient data stores), Zone 3 (Internal — medical device lateral paths), Zone 6 (Cloud — PHI in CSPs).

**Critical infrastructure / utilities:**
Zone 7 dominates. Passive-only deception. Coordinate with NERC CIP or IEC 62443 compliance team before deployment.
