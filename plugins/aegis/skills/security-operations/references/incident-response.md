# Incident Response — Reference

**Entry Criteria:** Incident declared at P1/P2/P3; Incident Commander assigned; initial scope completed.

**Required Inputs:** Incident ticket, scope assessment, EDR console access, network isolation capability, forensic tooling.

## PICERL Framework

### Preparation
Ongoing activities before any incident:
- IR plan documented, approved, and tested via tabletop exercise annually
- Incident Commander (IC) and backup IC identified and trained
- Contact list current: Legal, HR, DPO, PR, executive team, law enforcement liaison
- Out-of-band communications channel established (separate from potentially compromised email)
- EDR isolation capability tested; break-glass credentials in PAM vault
- Forensic collection kit pre-staged: KAPE, Velociraptor agent, FTK Imager

### Identification
- Confirm incident type (malware, insider, DDoS, data breach, ransomware)
- Assign severity (P1–P4) based on scope
- Activate appropriate IR playbook
- Open incident ticket; assign IC

### Containment

**Immediate containment (P1: within 1 hour; P2: within 4 hours):**

```
1. Network isolate compromised hosts via EDR console
2. If EDR unavailable: disable network port at switch level
3. Revoke active sessions for compromised accounts (force re-auth)
4. Block IOCs at perimeter (IP/domain/hash) in firewall and proxy
5. Preserve memory before isolation if forensically required
6. Do NOT reimage before evidence collection is complete
```

**Short-term containment:**
- Reset credentials for all accounts that authenticated on compromised hosts
- Disable affected service accounts
- Rotate secrets/API keys that may have been exposed

### Eradication
- Remove all attacker artefacts: malware files, persistence mechanisms, rogue accounts
- Patch exploited vulnerability or disable exploited feature
- Confirm no backdoors remain (golden ticket/skeleton key check for AD incidents)

### Recovery
- Reimage or restore from last-known-good snapshot
- Re-enrol in EDR with fresh policy
- Monitor for re-compromise for 72 hours post-recovery
- Restore service with enhanced monitoring in place

### Lessons Learned (See post-incident-review phase)

## Immediate Containment Steps by Incident Type

| Incident Type | Priority 1 Action | Priority 2 Action |
|--------------|------------------|------------------|
| Ransomware | Network isolate ALL infected hosts; disable admin shares | Contact cyber insurance; preserve encrypted files for recovery |
| Data exfiltration | Block exfil destination IPs/domains; quarantine source host | Determine scope of data accessed; prepare regulatory notification |
| Account compromise | Force password reset + revoke all sessions + disable account | Review all activity since compromise date |
| Insider threat | Preserve HR/legal privilege; do not alert user; collect evidence | Involve Legal/HR immediately |
| DDoS | Enable scrubbing service; activate CDN; notify ISP | Monitor for follow-on intrusion attempt during DDoS distraction |
