# Investigation — Reference

Use during Phase 4 to triage hunt findings and investigate anomalies through to a definitive verdict.

## Triage Workflow Tree

```
Anomaly / Hunt Finding
        │
        ├─► Is this a known-good pattern? (check baseline / whitelist)
        │       YES → Mark benign; update whitelist
        │       NO  ↓
        │
        ├─► Is there a matching threat intel indicator? (IOC, TTP)
        │       YES → Escalate to true-positive; trigger IR
        │       MAYBE ↓
        │
        ├─► Pivot investigation — gather additional context
        │       - Timeline of events on affected host
        │       - Process lineage (parent → child → grandchild)
        │       - Network connections from/to affected host
        │       - User account activity
        │       VERDICT ↓
        │
        ├─► Insufficient evidence → True-Positive Unconfirmed
        │       Document and monitor for 48 hours; set watch alert
        │
        └─► Sufficient evidence → True-Positive Confirmed
                Trigger IR playbook; create incident ticket
```

## Pivot Techniques Table

| Starting Point | Pivot To | Tool / Query | Purpose |
|---------------|----------|-------------|--------|
| Suspicious process | Parent process | Sysmon EID 1 `ParentProcessId` | Identify how process was spawned |
| Process | Network connections | Sysmon EID 3 `ProcessId` | Find C2 or lateral movement |
| IP address | All hosts connecting to it | NetFlow / firewall logs | Determine scope of compromise |
| User account | All logon events | Security Event 4624 `TargetUserName` | Identify compromised account spread |
| File hash | EDR platform | Search all endpoints for hash | Determine campaign scope |
| Domain name | Passive DNS history | VirusTotal / DNSDB | Understand C2 infrastructure |

## Evidence Collection Steps

When a true-positive is suspected, collect and preserve:

1. **Timeline** — first and last observed event timestamps
2. **Process tree** — full parent-child chain from initial execution
3. **Network artefacts** — C2 IPs, domains, user-agents
4. **Persistence mechanisms** — registry keys, scheduled tasks, services, startup items
5. **Credentials touched** — accounts with logon events on affected host
6. **Lateral movement** — destination hosts accessed from initial compromise

## Verdict Documentation Template

```
Hunt ID: H-001
Hypothesis: [original hypothesis]
Verdict: True-Positive / False-Positive / Benign
ATT&CK Techniques Confirmed: T1021.002, T1053.005
Affected Assets: dc01.corp, ws045.corp
Attacker Actions: [summary]
IOCs: [list]
IR Ticket: INC-2025-0042
Detection Rule Created: Yes — sigma/scheduled-task-lateral.yml
```
