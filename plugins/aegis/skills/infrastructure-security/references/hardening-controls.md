# Hardening Controls — Reference

Use during Phase 4 to implement OS and platform hardening controls aligned to CIS Benchmarks and NIST guidance.

## Windows Server Hardening Controls

| Control | Implementation | ATT&CK Technique Mitigated |
|---------|---------------|---------------------------|
| Credential Guard | Enable via Group Policy: Device Guard | T1003 OS Credential Dumping |
| Windows Defender Credential Guard | `lsaiso.exe` process isolation | T1003.001 LSASS Memory |
| Disable NTLM (where possible) | GPO: Network Security — Restrict NTLM | T1557 Adversary-in-the-Middle |
| AppLocker / WDAC | Whitelist approved executables, scripts, DLLs | T1204, T1059 |
| Audit policy (advanced) | Logon, Account Management, Object Access, Process Creation | T1078, T1059 detection |
| Local admin password (LAPS) | Microsoft LAPS deployed to all workstations/servers | T1021.002 (pass-the-hash) |
| PowerShell Constrained Language Mode | Registry: `__PSLockdownPolicy = 4` | T1059.001 |
| Protected Users group | Add privileged accounts to Protected Users | T1558 Kerberoasting |

## Linux Server Hardening Controls

| Control | Implementation | ATT&CK Technique Mitigated |
|---------|---------------|---------------------------|
| SSH hardening | Disable root login, password auth; use ed25519 keys; `AllowUsers` | T1021.004 |
| sudo restrictions | Limit `sudo` to specific commands; avoid `NOPASSWD` | T1548 Abuse Elevation |
| auditd rules | Monitor `/etc/passwd`, `/etc/shadow`, `/bin`, SUID file exec | T1003.008, T1059 |
| sysctl hardening | `net.ipv4.ip_forward=0`, `kernel.randomize_va_space=2` | Multiple |
| SELinux / AppArmor | Enforcing mode with application-specific profiles | T1068 Exploit for Privilege Escalation |
| File integrity monitoring | AIDE or Tripwire on critical system files | T1565 Data Manipulation |

## Cloud Infrastructure Hardening Controls

| Control | Implementation | ATT&CK Technique Mitigated |
|---------|---------------|---------------------------|
| IMDSv2 (AWS) | Require IMDSv2: `--metadata-options HttpTokens=required` | T1552.005 Cloud Instance Metadata |
| IAM least privilege | Enforce permission boundaries; no wildcard `*` actions | T1078.004 Cloud Accounts |
| S3 Block Public Access | Account-level block public access policy | T1530 Data from Cloud Storage |
| Secrets Manager (no hardcoded creds) | Scan code for secrets: `trufflehog`, `git-secrets` | T1552.001 |
| GuardDuty / Defender for Cloud | Enable with threat intel feed integration | Detection coverage |
| MFA on all privileged accounts | Enforce via SCP/Azure Policy | T1078 |
