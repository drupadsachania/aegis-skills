# Endpoint Incident Response — Reference

Use during Phase 4 to execute structured incident response for endpoint-related incidents using the PICERL framework.

## PICERL Framework — Endpoint IR

### Preparation
- IR runbook pre-approved and stored in offline location
- EDR platform admin credentials in PAM vault
- Forensic collection tools pre-staged (FTK Imager, Velociraptor, KAPE)
- Isolation procedure tested and documented (EDR network isolation + manual fallback)
- Legal/HR contacts identified for insider threat scenarios

### Identification
Confirmed incident triggers:
- EDR alert with HIGH/CRITICAL severity not resolved by automated response
- Multiple alerts on same host within 1 hour (attack chain indicator)
- Unusual process spawning LSASS or accessing credential stores
- Lateral movement detected from endpoint

### Containment
```
Immediate containment (within 15 minutes of P1 declaration):

1. Network isolate via EDR console:
   - CrowdStrike: Right-click host → "Network Contain"
   - MDE: Action → "Isolate device"
   - SentinelOne: Actions → "Network Quarantine"

2. If EDR isolation unavailable:
   - Disable network port (switch port shutdown)
   - Block host IP at perimeter firewall

3. Preserve memory BEFORE isolation if forensically required:
   winpmem_mini.exe --output memory.dmp
```

### Eradication
- Remove malware artefacts identified in analysis (files, registry keys, scheduled tasks)
- Revoke and reset all credentials used on or accessed from the compromised host
- Remove attacker persistence mechanisms (run key, service, WMI subscription)
- Patch exploited vulnerability or disable exploited feature

### Recovery
- Reimage host from golden image (preferred over cleaning)
- Restore from last-known-good backup if reimaging not possible
- Re-enrol in EDR with clean policy
- Monitor for re-compromise for 72 hours post-recovery
- Restore user access only after confirming clean state

### Lessons Learned
- PIR meeting within 5 business days
- Document timeline: initial compromise → detection → containment → eradication → recovery
- Record MTTD, MTTC, MTTR
- Update detection rules with new IOCs
- Update runbook with gaps identified during response

## Artefact Collection Checklist

| Artefact | Collection Method | Priority |
|----------|-----------------|---------|
| Memory dump | winpmem / LiME (Linux) | High — collect before isolation |
| Prefetch files | `%SystemRoot%\Prefetch\` | High |
| Event logs | `wevtutil epl Security security.evtx` | High |
| Browser history | `%APPDATA%\...\Chrome\User Data\Default\History` | Medium |
| Scheduled tasks | `schtasks /query /fo LIST /v > tasks.txt` | High |
| Running processes | `tasklist /v > processes.txt` | High |
| Network connections | `netstat -anob > netstat.txt` | High |
