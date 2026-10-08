# Incident Detection — Reference

**Entry Criteria:** SIEM alert escalated from triage as potential incident; analyst judgment during threat hunt; external notification (partner, vendor, regulator, law enforcement).

**Required Inputs:** Alert details, enrichment data, asset inventory, ATT&CK reference.

## Scope Questions Tree

When a potential incident is identified, answer these questions in order:

```
1. What systems are affected?
   → List hostnames/IPs; assign asset tiers
   
2. What is the attacker's current position?
   → Initial access only? Lateral movement detected? Persistence established?
   
3. What data may be at risk?
   → Map affected systems to data classifications (PII, PAN, trade secrets)
   
4. How long has the attacker been present?
   → MTTD: earliest indicator timestamp vs detection time
   
5. Is the attack ongoing or complete?
   → Active C2 comms? Ongoing encryption? Or historical artefacts only?
```

## ATT&CK Tactic Detection Table

| ATT&CK Tactic | What to Look for in Logs |
|--------------|--------------------------|
| Initial Access (TA0001) | Email gateway: phishing links/attachments opened; WAF: exploit payloads against public apps; VPN: unusual source IPs or off-hours logins |
| Execution (TA0002) | Sysmon EID 1: cmd.exe / PowerShell spawned by Office process; script engine invocations; encoded commands |
| Persistence (TA0003) | Security EID 4698: scheduled task created; EID 4697: service installed; registry run key modifications |
| Privilege Escalation (TA0004) | EID 4672: special privileges assigned; LSASS access (Sysmon EID 10); token manipulation |
| Defence Evasion (TA0005) | Security tool process terminated; event log cleared (EID 1102); LOLBin execution (certutil, mshta, regsvr32) |
| Credential Access (TA0006) | Sysmon EID 10 targeting lsass.exe; large volumes of Kerberos TGS requests (Kerberoasting); NTLM relay attempts |
| Discovery (TA0007) | EID 4661: AD object enumeration; nmap/ping sweep in NetFlow; net commands (net user, net group) |
| Lateral Movement (TA0008) | SMB connection to admin shares (EID 5140); WMI/PSExec execution; RDP logon from unusual source |
| Command and Control (TA0011) | Regular-interval outbound connections; DNS to DGA domains; HTTPS to newly registered/low-reputation domains |
| Exfiltration (TA0010) | Large outbound data volume spikes; archive file creation before exfil; cloud sync tool invocation |

## Severity Declaration Criteria

| Severity | Conditions | Declare Within |
|----------|-----------|---------------|
| P1 | Active data exfiltration; ransomware encryption; Tier 1 asset fully compromised | 15 minutes |
| P2 | Confirmed adversary in network; Tier 2 asset compromised; lateral movement detected | 30 minutes |
| P3 | Suspicious activity on single endpoint; unconfirmed compromise indicator | 2 hours |
| P4 | Policy violation; no confirmed compromise | 4 hours |

**Outputs:** Incident declaration (if criteria met); severity assignment; initial scope assessment; notification to Incident Commander.
