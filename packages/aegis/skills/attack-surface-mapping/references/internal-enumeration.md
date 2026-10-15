# Internal Exposure Review — Reference

Use during Phase 2 to map the internal attack surface of systems you own or are authorized to assess:
which services, accounts and misconfigurations a defender should find and fix before an attacker could
reach them. This is a defensive inventory and configuration review, not a credential attack. Credential
attacks and exploitation are out of scope for this skill; the assistant proposes nothing active and runs
nothing. An operator runs read-only inventory steps against their own network, with authorization.

## Service inventory (read-only, operator-run)

```bash
# Live-host discovery on your own ranges
nmap -sn 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 -oG live-hosts.gnmap

# Service and version inventory on discovered hosts
nmap -sV -sC --top-ports 1000 -iL live-hosts.txt -oX internal-scan.xml

# Read-only LDAP inventory of domain computers (bind as a normal read account)
ldapsearch -x -H ldap://10.0.0.10 -b "DC=corp,DC=example,DC=com" "(objectClass=computer)"
```

Prefer your existing asset inventory, EDR and directory tooling where it already has this data. SMB share
and account inventory should come from the file-server and directory audit logs your team controls, not
from scanning you are not authorised to run.

## Exposures to find and fix

Each row is a weakness a defender looks for in their own environment and the control that closes it. The
detection column describes what to review; it is not an instruction to attack an account.

| Exposure | ATT&CK ID | What to review (defensive) | Why it matters | Remediation |
|---|---|---|---|---|
| Service accounts with SPNs and weak or old passwords | T1558.003 | Directory report of accounts with an SPN, their password age and length | Roastable service credentials | Move to Group Managed Service Accounts (gMSA); long random passwords; monitor for roasting |
| Accounts without Kerberos pre-auth | T1558.004 | Directory report of accounts with "do not require pre-auth" set | Offline-attackable accounts | Require pre-auth; alert on the setting being enabled |
| LLMNR / NBT-NS enabled | T1557.001 | GPO and host settings for name-resolution fallback | Credential-theft foothold on a segment | Disable LLMNR/NBT-NS via GPO; enable SMB signing |
| Default credentials on devices | T1078.001 | Inventory of network devices, printers and IoT still on vendor defaults | Trivial unauthorised access | Change defaults; isolate management interfaces |
| Unconstrained Kerberos delegation | T1558 | Directory report of computers and accounts with unconstrained delegation | Path to domain-wide compromise | Move to constrained or resource-based delegation |
| Weak or reused account passwords | T1110 | Password-policy review and an offline check of your directory against a breached-password list, run by the identity team | Guessable credentials | Enforce length and a banned-password list; enable MFA |
| Plaintext credentials in shares | T1552.001 | Data-discovery scan of file shares for config files and scripts that contain secrets | Harvestable credentials | Remove secrets from shares; move them to a secrets manager; restrict share permissions |

## Internal Risk Register

| Finding | Asset | ATT&CK ID | Why it matters | Remediation |
|---|---|---|---|---|
| Service account with SPN and weak password | svc-backup | T1558.003 | Roastable service credential | Rotate to a long random password or use a gMSA; monitor for roasting |
| LLMNR enabled on user VLAN | All workstations | T1557.001 | Name-resolution fallback enables credential theft | Disable via GPO; enable SMB signing |
| Unconstrained delegation on APP-SERVER01 | APP-SERVER01 | T1558 | Delegation path toward domain compromise | Move to constrained or resource-based delegation |
| Default credentials on HP printer | Printer-02 | T1078.001 | Unauthorised admin access | Change default credentials; network isolate |
