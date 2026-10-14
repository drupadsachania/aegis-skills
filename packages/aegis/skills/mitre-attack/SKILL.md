---
name: mitre-attack
description: >-
  MITRE ATT&CK threat modelling workflow. Triggers for: adversary TTP mapping,
  threat actor profiling, kill chain analysis, technique selection for
  security controls, ATT&CK Navigator usage, ICS/OT threat modelling,
  ATT&CK-based detection gap analysis, or any exercise requiring adversary
  behaviour mapping.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.1"
  osk: "1.1"
  family: "framework"
---

# MITRE ATT&CK Skill

## Scope and authorization

- Purpose: Map adversary behaviour to MITRE ATT&CK to drive threat models, detections and control gap analysis.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: operational attack planning against real targets and step-by-step intrusion guidance.
- No network or API calls by the assistant: it never makes network requests, calls APIs or contacts outside services. Commands here are for a human operator to review and run. Redact secrets, credentials, personal data and samples before sharing anything.


## Purpose

Map adversary behaviour to ATT&CK techniques. Use this skill to build structured threat models,
identify detection gaps, and feed technique selections into deception engineering or security
control design.

## Phase Map

```
Phase 0 → Identify adversary archetype and scope (Enterprise / ICS / Mobile)
Phase 1 → Enterprise matrix orientation    [read: references/enterprise-matrix-overview.md]
Phase 2 → ICS matrix orientation (OT only) [read: references/ics-matrix-overview.md]
Phase 3 → TTP profiling                    [read: references/ttp-profiling-guide.md]
Phase 4 → Output: threat model with top 7 technique IDs + kill chain positions
```

## Phase 0 — Scope and Adversary Archetype

Before loading any matrix reference, establish:

1. **Environment type**: Enterprise (IT), ICS/OT, Cloud, Mobile, or hybrid
2. **Adversary archetype**: Nation-state APT / Cybercriminal / Insider / Hacktivist
3. **Industry vertical**: Determines which threat actor groups are most relevant
4. **Goal of the exercise**: Detection gap analysis / deception placement / control design / incident response

Map the archetype to likely technique clusters. Proceed to Phase 1 (Enterprise) or Phase 2 (ICS) as appropriate.

## Output Format

Every ATT&CK session produces a threat model table:

| Technique ID | Name | Tactic | Kill Chain Position | Priority |
|---|---|---|---|---|
| T1078 | Valid Accounts | Persistence, Privilege Escalation | Mid-stage | High |

Feed this table directly into `mitre-engage` or `deception-engineering` for deception placement.

## Threat Actor Profiles — ATT&CK Technique Mappings

### APT29 (Cozy Bear / The Dukes) — Russian SVR

**Primary sectors targeted:** Government, think tanks, healthcare, energy, defence contractors

| Phase | ATT&CK Technique | Sub-technique | Notes |
|-------|-----------------|---------------|-------|
| Initial Access | T1566 Phishing | T1566.001 Spearphishing Attachment | NOBELIUM campaigns targeting microsoft windows via malicious Office documents |
| Initial Access | T1190 Exploit Public-Facing Application | — | CVE exploitation against web servers |
| Execution | T1059 Command and Scripting Interpreter | T1059.001 PowerShell, T1059.005 VBScript | SUNBURST used PowerShell for C2 |
| Persistence | T1547 Boot/Logon Autostart | T1547.001 Registry Run Keys | Persistence on microsoft windows via HKCU run keys |
| Credential Access | T1003 OS Credential Dumping | T1003.001 LSASS Memory | MiniDump of LSASS on windows endpoints; T1558.003 Kerberoasting in AD |
| Lateral Movement | T1021 Remote Services | T1021.001 RDP, T1021.002 SMB | WMIEXEC and PsExec across windows hosts; SSH to servers |
| C&C | T1573 Encrypted Channel | T1573.002 Asymmetric Cryptography | encrypted C2 tunnels |
| Exfiltration | T1048 Exfiltration Over Alternative Protocol | T1048.003 Exfil over HTTPS | Data exfiltrated via HTTPS to legitimate cloud services (T1567) |


### Lazarus Group (APT38) — North Korean RGB

**Primary sectors targeted:** Financial (SWIFT theft), cryptocurrency, defence industrial base

| Phase | ATT&CK Technique | Sub-technique | Notes |
|-------|-----------------|---------------|-------|
| Initial Access | T1566 Phishing | T1566.002 Spearphishing Link | Job-offer lures targeting developers via LinkedIn |
| Initial Access | T1195 Supply Chain Compromise | T1195.002 Compromise Software Supply Chain | Trojanised developer tools distributed via hosted repos |
| Execution | T1059 Script Interpreter | T1059.006 Python, T1059.001 PowerShell | BLINDINGCAN malware |
| Persistence | T1543 Create/Modify System Process | T1543.003 Windows Service | Malicious windows services; T1547.006 Kernel Modules and Extensions |
| Credential Access | T1110 Brute Force | T1110.003 Password Spraying | Against exposed HTTPS endpoints |
| Privilege Escalation | T1068 Exploitation for Privilege Escalation | — | CVE exploitation for privilege escalation |
| Defense Evasion | T1027 Obfuscated Files | T1027.002 Software Packing | TAINTEDSCRIBE packed binaries; T1070.004 File Deletion |
| Lateral Movement | T1021 Remote Services | T1021.004 SSH | SSH pivoting across servers; T1570 Lateral Tool Transfer |
| Collection | T1005 Data from Local System | — | SWIFT transaction data from banking systems |
| C&C | T1095 Non-Application Layer Protocol | — | Custom TCP protocol; proxied HTTPS fallback |
| Exfiltration | T1041 Exfiltration over C2 | — | Chunked data via C2 channel; T1030 Data Transfer Size Limits |


## Deployment Context

This skill operates against Microsoft Windows Active Directory environments, servers, web tiers, and secured APIs. Threat actor TTPs described above are validated against real-world incidents involving these platforms.

## Phases

Load each phase only when the workflow reaches it:

- [Enterprise matrix overview](references/enterprise-matrix-overview.md)
- [Ics matrix overview](references/ics-matrix-overview.md)
- [Ttp profiling guide](references/ttp-profiling-guide.md)
- [Live threat intel](references/live-threat-intel.md) — auto-updated weekly
