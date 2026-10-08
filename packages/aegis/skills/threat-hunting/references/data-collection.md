# Data Collection — Reference

Use during Phase 2 to validate that required telemetry is available and of sufficient quality for the hunt.

## Telemetry Requirements by Hunt Target

| Hunt Target | Required Log Source | Minimum Retention | Quality Check |
|-------------|--------------------|--------------------|---------------|
| Lateral movement (SMB) | Windows Security Event 4624/4625/5140/5145, NetFlow | 90 days | Confirm Tier 1/2 servers logging to SIEM |
| Persistence (scheduled tasks) | Windows Security 4698/4699, Sysmon EID 11/12/13 | 90 days | Confirm Sysmon deployed to all endpoints |
| Credential access (LSASS) | Sysmon EID 10, Windows Security 4656 | 30 days | Confirm kernel-level telemetry active |
| C2 beaconing (DNS) | DNS query logs (all recursive resolvers) | 180 days | Confirm all DNS traffic routes via monitored resolver |
| Execution (PowerShell) | PowerShell Script Block (Event 4104), Sysmon EID 1 | 90 days | Confirm PS ScriptBlock logging GPO deployed |
| Cloud lateral movement | CloudTrail (AWS), Unified Audit Log (M365), Azure Activity Log | 365 days | Confirm all regions/services enabled |

## Telemetry Quality Checklist

- [ ] Log source covers ≥ 95% of in-scope assets (check SIEM source inventory)
- [ ] Time skew < 5 seconds (NTP enforced; verify with SIEM ingest timestamp vs log timestamp)
- [ ] No data gaps in the hunt window (check index continuity in SIEM)
- [ ] Command-line arguments included in process creation events (not just executable name)
- [ ] Parent-child process relationships available (Sysmon EID 1 ParentProcessId)
- [ ] User context included (not just SYSTEM; individual user account visible)

## SIEM Query Examples

### Splunk (SPL)
```spl
# Scheduled task creation outside business hours
index=wineventlog EventCode=4698 earliest=-7d
| eval hour=strftime(_time, "%H")
| where hour < 8 OR hour > 18
| stats count by TaskName, SubjectUserName, ComputerName
```

### Elastic (EQL)
```eql
# LSASS memory access by non-whitelisted process
process where event.action == "ProcessAccess"
  and process.pe.original_file_name != "svchost.exe"
  and target.process.name == "lsass.exe"
  and not process.name in ("MsMpEng.exe", "csrss.exe")
```

### Microsoft Sentinel (KQL)
```kql
// PowerShell encoded command execution
SecurityEvent
| where TimeGenerated > ago(7d)
| where EventID == 4104
| where ScriptBlockText has_any ("encodedcommand", "-enc ", "FromBase64String")
| summarize count() by Account, Computer, ScriptBlockText
| order by count_ desc
```
