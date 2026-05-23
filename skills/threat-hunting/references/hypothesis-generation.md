# Hypothesis Generation — Reference

Use during Phase 1 to formulate structured hunting hypotheses before querying telemetry.

## Hypothesis Structure

A valid hunt hypothesis follows this format:

> **"[Adversary actor or technique] is [performing behaviour] using [mechanism], which would be visible in [telemetry source]."**

Example:
> "A threat actor is achieving persistence via a scheduled task using PowerShell encoded commands, which would be visible in Windows Security Event Log (4698) and Sysmon Event ID 1."

## Example Hypothesis Table

| Hypothesis ID | Actor / Technique | Behaviour | ATT&CK ID | Detection Gap | Telemetry Source | Priority |
|--------------|-------------------|-----------|-----------|--------------|-----------------|---------|
| H-001 | Ransomware precursor | Lateral movement via SMB admin shares | T1021.002 | SIEM rule missing for internal SMB to C$ | Windows Security Event 5140 + NetFlow | High |
| H-002 | APT — persistence | Scheduled task creation by non-standard process | T1053.005 | No alert on tasks created outside business hours | Sysmon EID 11, Event 4698 | High |
| H-003 | Living-off-the-land | PowerShell downloading payload from internet | T1059.001, T1105 | PowerShell logging not fully deployed | Sysmon EID 1 (cmd line), Event 4104 (script block) | High |
| H-004 | Credential theft | LSASS memory access by non-system process | T1003.001 | Alert suppressed for antivirus processes | Sysmon EID 10 (process access) | Critical |
| H-005 | C2 beaconing | Regular-interval DNS queries to newly registered domain | T1071.004 | No DGA detection in DNS pipeline | DNS query logs + domain age lookup | Medium |

## Prioritisation Scoring

Score each hypothesis to determine hunt order:

| Factor | Score 1 (Low) | Score 2 (Medium) | Score 3 (High) |
|--------|--------------|-----------------|---------------|
| Threat intel relevance | Generic technique | Seen in sector | Active campaign targeting org |
| Detection gap | Partial coverage | Large gap | No coverage |
| Asset exposure | Commodity assets | Business-critical | Crown jewel |
| Adversary capability required | High (zero-day) | Medium | Low (known exploit) |

**Total score ≥ 10** = start this week. **7–9** = next sprint. **< 7** = backlog.

## Input Sources for Hypothesis Generation

- MITRE ATT&CK Navigator — identify uncovered techniques
- Threat intelligence reports (sector-specific ISACs)
- Previous incident findings (recurring adversary TTPs)
- Red team/purple team outputs — techniques tested but no detection
- CISA advisories — actively exploited techniques
