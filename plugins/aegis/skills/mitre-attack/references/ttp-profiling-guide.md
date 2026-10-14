# TTP Profiling Guide

Use during Phase 0 to build an adversary profile from ATT&CK techniques.

## Step 1 — Identify adversary archetype
- Nation-state APT → focus on persistence, credential access, exfiltration
- Cybercriminal → focus on initial access, ransomware impact chain
- Insider → focus on collection and exfiltration, minimal discovery
- Hacktivist → focus on impact and public-facing exploitation

## Step 2 — Select top 7 techniques
From the relevant matrix, select the 7 techniques most likely given:
- Industry vertical
- Known threat actor groups targeting this sector
- Previously observed TTPs in incident reports

## Step 3 — Map to kill chain position
For each technique note: early-stage (TA0043–TA0002), mid-stage (TA0003–TA0008), late-stage (TA0009–TA0040).
This tells you WHERE deception assets should sit on the kill chain.

## Step 4 — Output format
Produce a threat model summary:
| Technique ID | Name | Tactic | Kill Chain Position | Deception Relevance |
|---|---|---|---|---|
| T1078 | Valid Accounts | Persistence | Mid | High — honeytoken accounts |
