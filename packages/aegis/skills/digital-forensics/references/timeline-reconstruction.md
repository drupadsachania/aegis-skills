# Timeline Reconstruction

## Purpose
Build a unified, normalised super-timeline from all evidence sources to reconstruct the complete attack narrative for legal reporting and incident response.

---

## 1. Super-Timeline Construction with Plaso

### Data Sources to Include
```bash
# Create storage file from disk image
log2timeline.py --storage-file case.plaso /dev/sda   # Live disk
log2timeline.py --storage-file case.plaso disk.dd    # Image file

# Add memory dump artifacts
log2timeline.py --storage-file case.plaso --parsers=volatility memory.dmp

# Add Windows event logs (standalone)
log2timeline.py --storage-file case.plaso --parsers=winevt* evtx_directory/

# Add network PCAP
log2timeline.py --storage-file case.plaso --parsers=wireshark capture.pcap

# Add cloud logs (JSON)
log2timeline.py --storage-file case.plaso --parsers=jsonl cloudtrail_logs/
```

### Supported Artifact Parsers (key ones)
| Parser | Artifacts |
|--------|-----------|
| winevt | Windows Event Logs |
| prefetch | Prefetch files |
| winreg | Registry hives |
| mft | $MFT (NTFS) |
| usnjrnl | $UsnJrnl |
| lnk | LNK files |
| olecf | Office documents, jumplists |
| sqlite | Browser databases, mobile artifacts |
| syslog | Linux syslogs |
| bash_history | Linux bash history |

---

## 2. Timeline Export and Filtering

```bash
# Export to CSV (L2T format)
psort.py -o l2tcsv -w timeline.csv case.plaso

# Export to JSON
psort.py -o json_line -w timeline.jsonl case.plaso

# Filter by time range
psort.py -o l2tcsv -w filtered.csv case.plaso "date > '2026-01-01 00:00:00' AND date < '2026-06-01 00:00:00'"

# Filter by source type
psort.py -o l2tcsv -w reg_events.csv case.plaso "source_short == 'REG'"

# Filter by keyword
psort.py -o l2tcsv -w suspicious.csv case.plaso "message CONTAINS 'powershell'"

# Filter by specific file/path
psort.py -o l2tcsv -w appcompat.csv case.plaso "source_long == 'APPCOMPAT_CACHE'"
```

---

## 3. Timeline Noise Reduction

### Common High-Volume Sources to Filter Initially
```bash
# Exclude known-noisy sources for initial triage
psort.py case.plaso -o l2tcsv -w triage.csv \
  "source_short != 'FILE' AND source_short != 'WEBHIST' AND date > '2026-05-01'"

# Focus on execution-related artifacts
psort.py case.plaso -o l2tcsv -w executions.csv \
  "source_short IN ('PREFETCH', 'APPCOMPAT_CACHE', 'AMCACHE', 'EID 4688')"

# Focus on persistence artifacts
psort.py case.plaso -o l2tcsv -w persistence.csv \
  "source_short IN ('REG', 'EID 7045', 'EID 4698')"
```

---

## 4. Event Correlation Across Sources

### Correlation Pattern: Process Execution
```
Timeline correlation for a suspicious process:
1. Prefetch: <process>.pf created/modified → timestamp of first/last execution
2. Amcache: hash of executed binary → verify integrity
3. Shimcache: file path existed → may predate execution
4. Security EID 4688: process creation (if audit policy enabled)
5. Sysmon EID 1: process creation with command line
6. Network: outbound connection from same PID around same time (Sysmon EID 3)
7. File system: files created/modified in same timeframe
8. Registry: run key modification for persistence
```

### Correlation Pattern: Lateral Movement
```
Source host:
  Sysmon EID 3: outbound SMB (port 445) to target host
  Sysmon EID 1: net.exe, psexec.exe, wmic.exe execution
  Security EID 4648: logon with explicit credentials

Target host:
  Security EID 4624 Type 3: network logon from source host
  Security EID 4672: privileged logon (admin access)
  Security EID 7045: new service installed (PsExec)
  Sysmon EID 1: PSEXESVC.exe process creation
  File system: %SystemRoot%\PSEXESVC.exe created
```

---

## 5. Timeline Visualisation

### Timeline Explorer (Eric Zimmermann)
```
1. Load CSV timeline file
2. Set date/time column
3. Colour code by source_short
4. Filter by time range and keywords
5. Bookmark significant events
6. Export filtered view for report
```

### Kibana / Elastic Stack
```bash
# Import plaso timeline to Elasticsearch
psort.py -o elastic -w ES case.plaso --elastic_server_url http://localhost:9200 \
  --index_name case_timeline

# Kibana: Create timeline visualisation
# X-axis: timestamp, Y-axis: event count
# Colour by: source_short (artifact type)
# Filter: timerange matching incident window
```

---

## 6. Narrative Construction

### Incident Timeline Narrative Template
```
INCIDENT TIMELINE RECONSTRUCTION
==================================

T-00:00 [Date/Time UTC] INITIAL ACCESS
  - Source: Email attachment (filename: <name>, hash: <sha256>)
  - Evidence: Mail server logs, Security EID 4688, Sysmon EID 11

T+00:05 EXECUTION
  - Macro executed in <document>
  - PowerShell launched (encoded command decoded: <decoded>)
  - Evidence: Sysmon EID 1, Security EID 4103

T+00:10 DISCOVERY
  - Whoami, net user /domain, arp -a executed
  - Evidence: Sysmon EID 1, cmd.exe command lines

T+00:45 PERSISTENCE
  - Registry run key set: HKCU\...\Run\<name> = <path>
  - Evidence: Sysmon EID 13, Registry timeline

T+01:30 LATERAL MOVEMENT
  - PsExec used to execute on <target_host>
  - Evidence: SMB connection in PCAP, Security EID 4624 on target

T+06:00 EXFILTRATION
  - <n> GB uploaded to <C2>
  - Evidence: Firewall logs, PCAP large outbound transfer
```

---

## 7. Expert Witness Documentation

If timeline will be used in legal proceedings:
- All timestamps in UTC with offset documented
- Tool versions documented (Volatility 3.x.x, Plaso x.x)
- Methodology documented (Locard's principle — every contact leaves a trace)
- Chain of custody maintained and documented
- Hash verification at each step documented
- Analyst CV/qualifications documented
- Peer review documented
- Preserve all working files and intermediate outputs

---

## 8. Timeline Checklist

- [ ] All available evidence sources ingested into plaso
- [ ] Timezone confirmed and all timestamps normalised to UTC
- [ ] High-noise sources filtered for initial triage
- [ ] Initial access event identified and timestamped
- [ ] Execution timeline reconstructed (prefetch, amcache, shimcache, EID 4688)
- [ ] Persistence mechanisms timestamped
- [ ] Lateral movement events correlated (source + target hosts)
- [ ] Data exfiltration timeframe identified
- [ ] Narrative written covering full attack lifecycle
- [ ] Timeline reviewed by second analyst
- [ ] Expert witness documentation completed if required
