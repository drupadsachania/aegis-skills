# MITRE Engage Matrix — Reference

MITRE Engage is the adversary engagement framework. It maps defensive activities
directly to ATT&CK techniques — for every ATT&CK technique, Engage specifies
which engagement activities can detect, deny, or study the adversary using it.

## Five Goal Categories

| Goal | Definition | Example Activities |
|------|------------|-------------------|
| Expose | Reveal adversary presence and TTPs | Lures, honeypots that log interaction |
| Affect | Degrade adversary capability or confidence | Introduce noise, false data, decoys |
| Elicit | Gather intelligence on adversary behaviour | High-interaction honeypots, canary credentials |
| Deny | Prevent adversary from achieving objective | Block access, hide real assets |
| Detect | Identify adversary activity | Honeytokens, tripwires, breadcrumbs |

## Core Activities (mapped to ATT&CK)

| Activity ID | Activity | Maps to ATT&CK Tactic |
|-------------|----------|-----------------------|
| EAC0002 | Persona Creation | Initial Access, Social Engineering |
| EAC0003 | Honey Credentials | Credential Access (T1078, T1552, T1558) |
| EAC0004 | Decoy Content | Collection (T1213, T1039) |
| EAC0005 | Decoy Network | Discovery, Lateral Movement |
| EAC0006 | Decoy System | Lateral Movement, Execution |
| EAC0007 | Lure | Initial Access, Phishing |
| EAC0010 | Introduced Vulnerabilities | Exploitation |
| EAC0013 | Network Diversity | Reconnaissance, Discovery |
| EAC0014 | Pocket Litter | Collection, Credential Access |
| EAC0017 | Software Manipulation | Execution, Persistence |
| EAC0019 | Isolated Environment | Any — controlled containment |
| EAC0020 | Backup and Recovery | Impact resilience |
| EAC0022 | Attack Vector Migration | Defense Evasion |

## Engage ↔ ATT&CK Mapping Principle
For each ATT&CK technique in your threat model, look up which Engage activities
intercept it. This is how you derive which deception assets to deploy.
Full mapping: https://engage.mitre.org/matrix/
