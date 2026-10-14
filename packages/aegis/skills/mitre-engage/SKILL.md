---
name: mitre-engage
description: >-
  MITRE Engage adversary engagement and deception planning workflow. Triggers
  for: deception activity selection, adversary engagement planning,
  deny/disrupt/degrade/deceive/expose strategy, mapping ATT&CK techniques to
  deception countermeasures, honeypot type selection, or any exercise
  requiring formal mapping of defensive deception activities to adversary
  TTPs.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.1"
  osk: "1.1"
  family: "framework"
---

# MITRE Engage Skill

## Scope and authorization

- Purpose: Plan adversary engagement and deception activities with MITRE Engage inside environments you defend.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: engagement operations on infrastructure you do not control, and hack-back or other offensive action against adversary systems.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.

## Purpose

Translate an ATT&CK threat model into a formal adversary engagement plan using the
MITRE Engage framework. Engage maps every ATT&CK technique to specific defensive
activities — this skill walks through that mapping systematically.

## Relationship to Other Skills

```
mitre-attack → produces threat model (top 7 technique IDs)
     ↓
mitre-engage → maps techniques to Engage activities → produces activity plan
     ↓
deception-engineering → deploys assets from activity plan
```

## Phase Map

```
Phase 0 → Input: receive ATT&CK threat model (technique IDs + adversary archetype)
Phase 1 → Engage matrix orientation   [read: references/engage-matrix-overview.md]
Phase 2 → Activity planning           [read: references/activity-planning-guide.md]
Phase 3 → Output: activity plan table (technique → Engage activity → asset type)
```

## Phase 0 — Input

Receive the ATT&CK threat model from the previous skill session or user input:
- List of top technique IDs (e.g. T1078, T1558, T1213)
- Adversary archetype (nation-state / cybercriminal / insider)
- Environment zones in scope (from attack surface assessment)
- Engagement goal: detect / elicit / deny / affect / expose

Once inputs are clear, proceed to Phase 1.

---

## EAC Activity Catalogue

The Engage Activity Catalogue (EAC) defines 17 discrete defensive activities. Each maps to one or more Engage goals (Expose, Affect, Elicit, Deny) and to specific ATT&CK tactics.

| EAC ID | Activity Name | Engage Goal | Operator Actions |
|--------|--------------|-------------|-----------------|
| EAC-0001 | Lure | Expose | Deploy honeytoken documents on file shares; plant breadcrumbs on web servers pointing to decoy assets |
| EAC-0002 | Honeypot | Expose, Elicit | Stand up full-interaction honeypot on systems mimicking production ssh/rdp; route all traffic to SIEM |
| EAC-0003 | Honeytoken | Expose | Embed fake AWS keys, fake certificates, fake database connection strings in source repositories |
| EAC-0004 | Decoy Network | Deny, Expose | Provision a shadow VLAN with fake microsoft windows domain controllers and workstations |
| EAC-0005 | Decoy Credentials | Expose, Elicit | Create domain accounts with plausible names; place in credential stores adversaries commonly target |
| EAC-0006 | Decoy Content | Expose | Populate decoy shares with realistic-looking files; include fake PII and fake financial records |
| EAC-0007 | Burn-in | Affect | Generate realistic historical DNS, HTTP, and SMB traffic to age decoy systems; use reverse proxy traffic replay |
| EAC-0008 | Isolation | Deny | Network-segment decoy environments so lateral movement is funnelled and observable |
| EAC-0009 | Malware Detonation | Elicit | Allow adversary payloads to execute in controlled sandbox; capture C2 callbacks for threat intel |
| EAC-0010 | Network Manipulation | Affect | Slow or redirect adversary exfiltration traffic using SDN rules; degrade adversary confidence |
| EAC-0011 | Software Manipulation | Affect | Modify binaries in decoy directories to produce erroneous but believable output |
| EAC-0012 | System Manipulation | Affect | Alter registry keys or /etc/hosts on decoy hosts to mislead adversary enumeration |
| EAC-0013 | Artifact Manipulation | Affect, Elicit | Plant modified configuration files and certificates that phone home on access |
| EAC-0014 | Persona | Elicit | Create convincing user personas with email, chat, and VPN activity patterns on microsoft windows domains |
| EAC-0015 | Pocket Litter | Expose | Scatter plausible documents, scripts, and browser history across decoy systems |
| EAC-0016 | Attack Vector Migration | Deny | Force adversary to pivot to monitored attack vectors by hardening real systems and leaving decoys accessible |
| EAC-0017 | Baseline | Expose, Elicit | Record normal adversary recon behaviour before introducing deception; establish detection baselines on web server access and error logs |

### Platform Notes

Deployments tested across:
- **microsoft** Active Directory and Windows domains for decoy credential environments (EAC-0004, EAC-0005, EAC-0014)

---

## Adversary Engagement Scenarios by Technique

### Scenario 1 — Credential Attack Engagement

Adversary attempts T1078 (Valid Accounts) and T1003 (OS Credential Dumping) against a microsoft windows domain. Operator deploys EAC-0005 decoy credentials that are seeded in LSASS-accessible stores. When the adversary dumps credentials and attempts T1550 (Use Alternate Authentication Material), the honeytoken account triggers an alert. EAC-0002 honeypot on a jump host captures T1021 (Remote Services) lateral movement attempt. All activity indexed against T1110 (Brute Force).

### Scenario 2 — Phishing and Initial Access Engagement

Adversary delivers T1566 (Phishing) with a malicious attachment targeting users. Operator pre-stages EAC-0015 pocket litter on a decoy workstation — fake VPN configs pointing to monitored web server. On T1204 (User Execution), the payload beacons to an EAC-0009 malware detonation environment. C2 traffic reveals T1071 (Application Layer Protocol) and T1105 (Ingress Tool Transfer) patterns. T1189 (Drive-by Compromise) variant also monitored.

### Scenario 3 — Lateral Movement Engagement

After initial access via T1190 (Exploit Public-Facing Application) on a web server target, adversary enumerates with T1018 (Remote System Discovery) and T1083 (File and Directory Discovery). EAC-0008 isolation funnels movement to decoy segment. T1021.002 (SMB/Windows Admin Shares) and T1091 (Replication Through Removable Media) attempts captured. EAC-0010 network manipulation degrades adversary's T1040 (Network Sniffing) effectiveness.

### Scenario 4 — Persistence Engagement

Adversary establishes T1543 (Create or Modify System Process) and T1547 (Boot or Logon Autostart Execution) on a decoy system. EAC-0012 system manipulation allows the persistence to install while logging every file write. T1053 (Scheduled Task/Job) and T1136 (Create Account) attempts also recorded. EAC-0014 personas interact with the adversary's implant to elicit C2 protocol details via T1095 (Non-Application Layer Protocol) monitoring.

### Scenario 5 — Collection and Exfiltration Engagement

Adversary targets T1213 (Data from Information Repositories) and T1039 (Data from Network Shared Drive) on decoy shares seeded with EAC-0006 content. T1560 (Archive Collected Data) and T1048 (Exfiltration Over Alternative Protocol) attempts flow through EAC-0010 network manipulation — traffic is throttled and redirected. Signed honeytoken files (EAC-0003) beacon on extraction. T1041 (Exfiltration Over C2 Channel) and T1567 (Exfiltration Over Web Service) patterns captured via web server access logs.

---

## Engage Activity Catalogue — EAC-0001 through EAC-0017

| EAC ID | Activity | Engage Goal | Deployment Phase | ATT&CK Techniques Intercepted |
|--------|----------|-------------|-----------------|-------------------------------|
| EAC-0001 | Baseline | Expose | Phase 1 | All — establishes normal behaviour baseline |
| EAC-0002 | Persona Creation | Affect / Expose | Phase 2 | T1566, T1598, T1585, T1586 — social engineering defence |
| EAC-0003 | Honey Credentials | Detect / Elicit | Phase 2 | T1078, T1552, T1558, T1003, T1110, T1555 — credential theft detection |
| EAC-0004 | Decoy Content | Detect / Elicit | Phase 2 | T1213, T1039, T1025, T1530, T1602 — data collection interception |
| EAC-0005 | Decoy Network | Expose / Detect | Phase 2 | T1021, T1135, T1046, T1040, T1571 — lateral movement detection |
| EAC-0006 | Decoy System | Elicit | Phase 2 | T1210, T1570, T1091, T1072, T1080 — remote service exploitation |
| EAC-0007 | Lure | Expose | Phase 2 | T1189, T1566, T1598, T1204 — initial access interception |
| EAC-0008 | Burn-In | Affect | Phase 2 | T1087, T1083, T1119, T1005 — recon believability |
| EAC-0009 | Malware Detonation | Elicit | Phase 2 | T1059, T1204, T1203, T1106 — execution analysis |
| EAC-0010 | Introduced Vulnerabilities | Elicit | Phase 1 | T1190, T1211, T1068, T1203 — exploitation elicitation |
| EAC-0011 | Network Analysis | Expose | Phase 2 | T1041, T1048, T1095, T1571, T1572 — C2 and exfil detection |
| EAC-0012 | Standard Operating Procedure | Baseline | Phase 1 | T1033, T1082, T1016, T1049 — user behaviour baseline |
| EAC-0013 | Network Diversity | Deny | Phase 2 | T1018, T1046, T1135, T1590, T1592 — reconnaissance denial |
| EAC-0014 | Pocket Litter | Detect | Phase 2 | T1083, T1005, T1025, T1039, T1213 — file system trap |
| EAC-0015 | Support | Expose | Phase 2 | T1573, T1090, T1102, T1568 — C2 infrastructure visibility |
| EAC-0016 | Threat Intelligence Sharing | Expose | Phase 2 | T1595, T1596, T1593, T1591 — recon attribution |
| EAC-0017 | Software Manipulation | Affect | Phase 2 | T1059, T1569, T1543, T1554 — execution and persistence confusion |

## Adversary Engagement Scenarios

### Scenario 1 — Credential Theft Engagement (Financial Services)

**Environment:** microsoft windows Active Directory domain, web tier, backend services, protected APIs

**Adversary TTP chain:**
1. T1566.001 (Spearphishing Attachment) → T1059.001 (PowerShell) → T1078.002 (Domain Accounts)
2. T1003.001 (LSASS Memory dump via mimikatz) → T1550.002 (Pass-the-Hash) → T1021.001 (RDP lateral movement)
3. T1552.001 (Credentials in Files) on servers → T1558.003 (Kerberoasting) against honeytoken SPNs

**Engagement response:**
- Deploy EAC-0003 Honey Credentials: service account honeytokens in AD, fake API keys in /home dirs and web server config
- Deploy EAC-0004 Decoy Content: fake merger documents on SharePoint triggering T1213 alerts
- Deploy EAC-0005 Decoy Network: isolated subnet with fake ERP — any RDP/SMB access fires SIEM
- EAC-0014 Pocket Litter: scatter encrypted fake archive files labelled "passwords_backup.7z"

**Expected operator actions per EAC:**
- EAC-0003: Monitor AD event logs for honeytoken SPN Kerberos ticket requests (Event ID 4769). Alert within 60s.
- EAC-0005: Any successful SMB connection to decoy subnet = confirmed lateral movement. Page SOC immediately.
- EAC-0014: File access alert on "passwords_backup.7z" = adversary in T1083 (File and Directory Discovery) phase.

### Scenario 2 — Ransomware Pre-deployment Engagement

**Environment:** hybrid cloud, microsoft windows endpoints, file servers with shares

**Adversary TTP chain:**
1. T1190 (Exploit Public-Facing Application) → T1059.003 (Windows Command Shell) → T1547.001 (Registry Run Keys)
2. T1082 (System Information Discovery) → T1016 (System Network Configuration Discovery) → T1018 (Remote System Discovery)
3. T1486 (Data Encrypted for Impact) pre-deployment staging via T1074.001 (Local Data Staging)

**Engagement response:**
- EAC-0010 Introduced Vulnerabilities: deploy apache httpd 2.4.49-equivalent decoy (believable CVE target) in DMZ
- EAC-0006 Decoy System: windows server with realistic but isolated file shares; any T1074 staging activity logged
- EAC-0013 Network Diversity: fragment network so adversary T1018 discovery returns inflated host count
- EAC-0017 Software Manipulation: modify cmd.exe on decoy windows hosts to log all T1059.003 commands

### Scenario 3 — APT Reconnaissance and Collection Engagement

**ATT&CK Techniques covered: T1595, T1596, T1590, T1589, T1592, T1593, T1591, T1598, T1597**

- EAC-0013 Network Diversity intercepts T1595 (Active Scanning) — decoy IPs respond to probes
- EAC-0002 Persona Creation for T1598 (Phishing for Information) — fake LinkedIn/GitHub profiles with breadcrumb credentials
- EAC-0007 Lure for T1589 (Gather Victim Identity Info) — seeded email addresses that trigger on lookup
- EAC-0016 Threat Intelligence Sharing routes T1595 scanner IPs to CTI platform for attribution

## Phases

Load each phase only when the workflow reaches it:

- [Engage matrix overview](references/engage-matrix-overview.md)
- [Activity planning guide](references/activity-planning-guide.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
