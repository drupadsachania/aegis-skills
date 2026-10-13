# Internal Enumeration — Reference

Use during Phase 2 to map the internal network attack surface, identifying services, credentials, and misconfigurations accessible to an attacker who has gained initial access.

## Network Service Enumeration

```bash
# Internal subnet sweep — identify live hosts
nmap -sn 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 -oG live-hosts.gnmap

# Top 1000 ports on discovered hosts
nmap -sV -sC --top-ports 1000 -iL live-hosts.txt -oX internal-scan.xml

# SMB enumeration — shares, users, OS
crackmapexec smb 10.0.0.0/24 --shares --users --pass-pol

# LDAP — domain enumeration (read-only, no credentials)
ldapsearch -x -H ldap://10.0.0.10 -b "DC=corp,DC=example,DC=com" "(objectClass=computer)"
```

## Credential Exposure Checks Table

| Attack Vector | ATT&CK ID | Detection Method | Risk |
|--------------|-----------|-----------------|------|
| Kerberoastable accounts (SPNs) | T1558.003 | `GetUserSPNs.py corp.example.com/user -request` | High — offline crack |
| AS-REP Roasting (no pre-auth) | T1558.004 | `GetNPUsers.py corp.example.com/ -usersfile users.txt` | High |
| LLMNR / NBT-NS poisoning | T1557.001 | Responder passive capture on network segment | High |
| Default credentials on devices | T1078.001 | Check network devices, printers, IoT for default passwords | Medium |
| Kerberos delegation (unconstrained) | T1558 | `Get-DomainComputer -Unconstrained` (PowerView) | Critical |
| Password spray via SMB | T1110.003 | `crackmapexec smb 10.0.0.0/24 -u users.txt -p 'Password1!'` | High |
| Plaintext credentials in shares | T1552.001 | Spider shares for config files, scripts with credentials | Critical |

## Internal Risk Register

| Finding | Asset | ATT&CK ID | Exploit Path | Remediation |
|---------|-------|-----------|-------------|-------------|
| Service account with SPN and weak password | svc-backup | T1558.003 | Kerberoast → crack → lateral movement | Rotate to long random password or use gMSA |
| LLMNR enabled on user VLAN | All workstations | T1557.001 | Responder → capture NTLMv2 hash → relay | Disable via GPO |
| Unconstrained delegation on APP-SERVER01 | APP-SERVER01 | T1558 | Coerce DC authentication → TGT capture | Move to constrained/resource-based delegation |
| Default credentials on HP printer | Printer-02 | T1078.001 | Web admin interface access | Change default credentials; network isolate |
