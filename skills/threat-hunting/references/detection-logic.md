# Detection Logic — Reference

Use during Phase 3 to build and validate detection rules from hunt findings.

## Sigma Rule Example

```yaml
# Sigma rule — Scheduled task creation by suspicious process
title: Suspicious Scheduled Task Creation
id: 7d4a2f3b-1234-4abc-8def-abcdef123456
status: experimental
description: Detects scheduled task creation by processes that don't normally create tasks
references:
  - https://attack.mitre.org/techniques/T1053/005/
tags:
  - attack.persistence
  - attack.t1053.005
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4698
  filter_legitimate:
    SubjectUserName|endswith: '$'  # Machine accounts
  filter_tools:
    TaskName|contains:
      - 'Microsoft'
      - 'Windows'
  condition: selection and not (filter_legitimate or filter_tools)
falsepositives:
  - Legitimate software installation
  - Admin task scheduling
level: medium
```

## Query Translation Table

| Technique | Detection Logic | SPL | EQL | KQL |
|-----------|----------------|-----|-----|-----|
| T1053.005 — Sched Task | New task outside business hours | `EventCode=4698 \| eval h=strftime(_time,"%H") \| where h<8 OR h>18` | `process where EventID==4698 and hour_of_day < 8` | `SecurityEvent \| where EventID==4698 \| where hourofday(TimeGenerated)<8` |
| T1021.002 — SMB Admin Shares | Access to C$ or ADMIN$ from workstations | `EventCode=5140 ObjectName="*\\C$" src_category=workstation` | `network where event.action=="share-access" and file.path has "C$"` | `SecurityEvent \| where EventID==5140 and ObjectName has "C$"` |
| T1059.001 — PowerShell | Encoded command execution | `EventCode=4104 Message="*encodedcommand*"` | `process where process.name=="powershell.exe" and process.args has "-enc"` | `SecurityEvent \| where EventID==4104 and CommandLine has "-enc"` |

## Anomaly Detection Baseline Approach

For techniques without clear signatures, use statistical baselining:

1. **Define the metric** — e.g., number of unique destination IPs per host per hour
2. **Collect baseline** — 14–30 days of normal operation
3. **Compute threshold** — mean + (2 × standard deviation) = upper alert threshold
4. **Alert on deviation** — flag hosts exceeding threshold for analyst review
5. **Tune weekly** — adjust threshold as baseline shifts (legitimate changes)

Baseline metrics to track:
- DNS query rate per host
- Outbound connections to new/unseen IPs
- Process creation rate per user
- Failed authentication rate per source IP
- Volume of data copied to USB/removable media
