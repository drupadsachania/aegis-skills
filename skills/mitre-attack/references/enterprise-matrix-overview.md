# MITRE ATT&CK Enterprise Matrix — Reference

Use during Phase 1 to map adversary TTPs to the Enterprise matrix.

## 14 Tactics (in kill-chain order)

| ID | Tactic | What the adversary is trying to do |
|----|--------|-------------------------------------|
| TA0043 | Reconnaissance | Gather info to plan operations |
| TA0042 | Resource Development | Establish infrastructure |
| TA0001 | Initial Access | Get into the network |
| TA0002 | Execution | Run malicious code |
| TA0003 | Persistence | Maintain foothold |
| TA0004 | Privilege Escalation | Gain higher-level permissions |
| TA0005 | Defense Evasion | Avoid detection |
| TA0006 | Credential Access | Steal credentials |
| TA0007 | Discovery | Figure out the environment |
| TA0008 | Lateral Movement | Move through the environment |
| TA0009 | Collection | Gather data of interest |
| TA0011 | Command & Control | Communicate with compromised systems |
| TA0010 | Exfiltration | Steal data |
| TA0040 | Impact | Manipulate, interrupt, or destroy |

## Top Techniques by Adversary Type

**Nation-state / APT:**
T1566 Phishing, T1078 Valid Accounts, T1021 Remote Services,
T1055 Process Injection, T1003 OS Credential Dumping, T1567 Exfiltration Over Web Service

**Cybercriminal / Ransomware:**
T1190 Exploit Public-Facing App, T1486 Data Encrypted for Impact,
T1490 Inhibit System Recovery, T1562 Impair Defenses

**Insider threat:**
T1052 Exfiltration Over Physical Medium, T1078 Valid Accounts,
T1213 Data from Information Repositories

## Querying the Live Matrix
ATT&CK STIX data: https://github.com/mitre/cti
ATT&CK Navigator: https://mitre-attack.github.io/attack-navigator/
