# Privileged Access Management

## Purpose
Design and operate a PAM programme covering credential vaulting, just-in-time access, session recording, and detection of ATT&CK techniques T1078, T1548, T1134.

---

## 1. PAM Architecture Components

| Component | Function | Example Products |
|-----------|---------|-----------------|
| Credential Vault | Secure storage and rotation of privileged credentials | CyberArk, HashiCorp Vault, BeyondTrust |
| Session Manager | Record and monitor privileged sessions | CyberArk PVWA, BeyondTrust PRA |
| Just-in-Time | Time-limited privilege elevation | CyberArk EPM, Delinea Server Suite, Azure PIM |
| Privilege Discovery | Find unmanaged privileged accounts | CyberArk DNA, BeyondTrust Discovery |
| Session Recording | Video + keystroke capture of privileged sessions | CyberArk SMP, ObserveIT |

---

## 2. Just-in-Time (JIT) Access

```
JIT Access Design Principles:
  - No standing privileged access for regular operational work
  - Privilege granted on demand, time-limited, auto-expiry
  - Access request requires justification (business reason)
  - Approval workflow (manager or security team, or auto-approve with MFA for pre-approved tasks)
  - Maximum duration: 4-8 hours per session; 1 business day for planned maintenance

JIT Workflow:
  1. User requests privileged access → specify system, reason, duration
  2. Automated approval check: is this pre-approved task? → auto-approve with MFA
     Or: send to approver → approve/deny within SLA
  3. Time-limited credentials issued (or role activated for duration)
  4. Session recording activated automatically
  5. On expiry: credentials revoked; session closed; recording stored
  6. Post-session review: user documents what was done

Azure AD Privileged Identity Management (PIM) example:
  1. Assign users as "Eligible" for privileged roles (not "Active")
  2. User activates role when needed: justify + MFA + time limit
  3. Role active for specified duration (max 8 hours)
  4. Audit log captures activation, approver, and duration
```

---

## 3. Privileged Account Discovery and Vaulting

### Account Discovery
```
Types of privileged accounts to discover:
  - Local admin accounts on all endpoints (T1078.003)
  - Domain admin accounts (T1078.002)
  - Service accounts with admin rights
  - Application service accounts (SQL, IIS, scheduled tasks)
  - Cloud IAM admin roles
  - Shared/generic admin accounts (violates individual accountability)
  - SSH root keys and sudo entries
  - Network device credentials

Discovery tools:
  CyberArk DNA: scans AD, Windows endpoints, Unix/Linux for privileged accounts
  BeyondTrust Privileged Discovery: agent-based and agentless scan
  Manual: AD PowerShell query
    Get-ADUser -Filter {AdminCount -eq 1} | Select Name,SamAccountName,Enabled
    Get-ADGroupMember "Domain Admins" -Recursive | Select Name
```

### Vaulting Process
```
1. Discover all privileged accounts (AD scan + manual review)
2. Vault credentials (PAM tool takes ownership of password)
3. Users access via PAM interface — never see actual password
4. Automatic rotation: daily for most privileged (service accounts),
                        on use for shared accounts,
                        on access revocation (immediately)
5. Verify: try to use password outside PAM — should fail (rotated)
```

---

## 4. Session Recording and Monitoring

```
Recording requirements:
  - All privileged sessions: record keystroke + video
  - Store recordings: minimum 12 months (90 days for low-risk)
  - Immutable storage (write-once; cannot be deleted by recorded user)
  - Search capability: command search across all recordings

Real-time alerting on:
  - Specific commands: rm -rf, shutdown, drop table, format, icacls, net user
  - Data access: bulk SELECT queries, file enumeration of sensitive dirs
  - Lateral movement: psexec, wmic /node, net use commands
  - Credential access: mimikatz strings, procdump on lsass

Integration with SIEM:
  Stream keylog events to SIEM for anomaly detection
  Alert on: unusual hours, unusual commands, unusual systems accessed
```

---

## 5. Break-Glass Procedures

```
Break-glass (emergency access) design:
  Use case: PAM system unavailable during critical incident

  Break-glass accounts:
    - Named accounts (not generic "admin")
    - Stored credentials in physical safe AND encrypted offline store
    - Dual-control: requires 2 named individuals to access
    - Password complexity: 25+ character random password
    - Change password after EVERY use

  Activation procedure:
    1. Declare break-glass event with timestamp and reason
    2. Two named individuals present (both log their presence)
    3. Retrieve credential (physical safe + audit log entry)
    4. Use credential; session recording via alternative means if possible
    5. Change credential immediately after session
    6. Post-incident review: document all actions taken
    7. Report to CISO within 24 hours
```

---

## 6. ATT&CK Technique Coverage

| Technique | Description | PAM Control |
|-----------|-------------|-------------|
| T1078 Valid Accounts | Use of compromised credentials | Vaulting; regular rotation; MFA |
| T1078.002 Domain Accounts | Admin account misuse | JIT; session recording; alerts |
| T1078.003 Local Accounts | Local admin exploitation | Discover and vault; LAPS deployment |
| T1548 Abuse Elevation | UAC bypass; sudo abuse | Endpoint privilege management; sudo rules |
| T1134 Access Token Manipulation | Token theft/impersonation | Session recording; anomaly detection |
| T1098 Account Manipulation | Adding accounts/privileges | Change monitoring; JIT for role changes |
| T1003.001 LSASS Memory | Credential harvesting from memory | EDR; restrict LSASS access; RunAsPPL |
