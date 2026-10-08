# Cloud and Mobile Forensics

## Purpose
Collect and analyse digital evidence from cloud platforms (AWS, Azure) and mobile devices (iOS, Android).

---

## 1. AWS CloudTrail Analysis

### Log Collection
```bash
# Download CloudTrail logs from S3
aws s3 sync s3://<bucket-name>/AWSLogs/<account-id>/CloudTrail/<region>/ \
  /tmp/cloudtrail/ --profile forensics-readonly

# Lookup events via API (last 90 days without log archiving)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin \
  --start-time 2026-01-01T00:00:00Z \
  --end-time 2026-06-01T00:00:00Z \
  --output json > console_logins.json
```

### Key Event Names for Forensics
| Event | Investigation Relevance |
|-------|------------------------|
| ConsoleLogin | Who logged into AWS console; sourceIPAddress |
| AssumeRole | Role assumptions (lateral movement) |
| CreateUser / CreateAccessKey | Persistence via new credentials |
| AttachUserPolicy / PutRolePolicy | Privilege escalation (T1078.004) |
| GetSecretValue | Secret access (Secrets Manager) |
| DeleteTrail / StopLogging | Defence evasion (T1562.008) |
| RunInstances | New EC2 launch (potential C2) |
| AuthorizeSecurityGroupIngress | Firewall modification |
| PutBucketPolicy / GetObject | Data exfiltration from S3 |

### CloudTrail Query Pattern
```bash
# Find all API calls from a suspicious IP
jq '.Records[] | select(.sourceIPAddress == "<suspicious_ip>") | {time: .eventTime, user: .userIdentity.arn, event: .eventName, region: .awsRegion}' *.json

# Find privilege escalation attempts
jq '.Records[] | select(.eventName | test("AttachUserPolicy|PutRolePolicy|CreateRole|AssumeRole")) | {time: .eventTime, user: .userIdentity.arn, event: .eventName}' *.json

# Failed API calls (access denied = reconnaissance or failed attack)
jq '.Records[] | select(.errorCode == "AccessDenied" or .errorCode == "UnauthorizedAccess")' *.json
```

---

## 2. Azure AD Audit Logs

### Log Sources
```
Azure AD Sign-In Logs:          audit: who logged in, from where, MFA status
Azure AD Audit Logs:            changes to users, groups, roles, apps
Azure Activity Log:             resource creation/modification/deletion
Microsoft Defender for Cloud:   security alerts
Azure Sentinel (if deployed):   SIEM correlation

# Export via Azure CLI
az monitor activity-log list --start-time 2026-01-01T00:00:00Z > activity.json
az ad audit-log list --filter "activityDateTime ge 2026-01-01" > audit.json
```

### Key Azure Investigation Areas
```
Privileged Role Assignments:
  "activityDisplayName": "Add member to role"
  Check: was the role Global Administrator, Application Administrator, etc.

Conditional Access Bypass:
  Sign-in logs: "conditionalAccessStatus": "notApplied"
  Indicates sign-in from non-compliant device or unusual location

OAuth App Consent:
  "activityDisplayName": "Consent to application"
  Attackers grant OAuth apps broad permissions for persistence

Federated Identity Changes:
  Modifications to trusted domains (T1484.002 Domain Trust Modification)
```

---

## 3. iOS Forensic Acquisition

### iCloud Backup (logical acquisition)
```
Tools: iMazing, libimobiledevice, Elcomsoft Phone Breaker

# iMazing process:
1. Connect iPhone to forensic workstation
2. iMazing > Back Up > Choose location
3. Enable: Include deleted data (if available)
4. Verify backup integrity (hash backup directory)

# iCloud backup acquisition (requires Apple ID credentials and 2FA):
Elcomsoft Phone Breaker > iCloud > Enter credentials > Download backup
```

### iOS Artifact Locations (in backup)
```
SQLite databases extracted from backup:
  SMS/iMessage:        Library/SMS/sms.db
  Call log:            Library/CallHistoryDB/CallHistory.storedata
  Safari history:      Library/Safari/History.db
  Contacts:            Library/AddressBook/AddressBook.sqlitedb
  Location history:    Library/Caches/com.apple.routined/
  Wi-Fi networks:      Library/Preferences/com.apple.wifi.plist
  Installed apps:      Library/Preferences/com.apple.mobile.installation.plist
```

---

## 4. Android Forensic Acquisition

### ADB Backup (logical — requires device unlock)
```bash
# Backup all apps
adb backup -apk -shared -all -f android_backup.ab

# Convert to tar for analysis
dd if=android_backup.ab bs=1 skip=24 | python3 -c \
  "import zlib,sys; sys.stdout.buffer.write(zlib.decompress(sys.stdin.buffer.read()))" > backup.tar

# Or: Android Backup Extractor
java -jar abe.jar unpack android_backup.ab backup.tar <password>
tar xf backup.tar
```

### Android Artifact Locations
```
/data/data/<package>/databases/    → SQLite databases per app
/data/data/com.android.providers.telephony/databases/mmssms.db → SMS
/data/data/com.android.providers.contacts/databases/contacts2.db → Contacts
/data/app/ → Installed APKs
/sdcard/DCIM/ → Photos/videos
/sdcard/WhatsApp/ → WhatsApp media and backups
```

---

## 5. Container Forensics

### Docker
```bash
# List container history (even stopped)
docker ps -a

# Inspect container metadata
docker inspect <container_id> > container_inspect.json

# Export container filesystem
docker export <container_id> -o container_fs.tar
tar xf container_fs.tar -C /tmp/container_analysis/

# Docker layer analysis (image history)
docker history <image_id> --no-trunc

# Docker daemon logs
journalctl -u docker --since "2026-01-01" > docker_daemon.log
```

### Kubernetes Audit Logs
```bash
# kube-apiserver audit log location (typical):
/var/log/kubernetes/audit.log

# Key events:
# verb=create resource=pods → pod creation (potential backdoor deployment)
# verb=exec resource=pods → kubectl exec (lateral movement / persistence check)
# user.username=system:anonymous → anonymous API access (misconfiguration)

# Filter for privilege escalation
jq 'select(.objectRef.resource=="clusterrolebindings" or .objectRef.resource=="rolebindings") | select(.verb=="create" or .verb=="update")' audit.log
```

---

## 6. Cloud and Mobile Checklist

- [ ] CloudTrail / Azure Activity logs collected for full incident timeframe
- [ ] IAM changes during incident timeframe reviewed (new users, role assignments)
- [ ] API calls from suspicious IPs extracted
- [ ] OAuth app consents reviewed (Azure/Google)
- [ ] Mobile acquisition method documented (logical/physical, tool used)
- [ ] Mobile backup integrity verified (hash)
- [ ] SMS, call log, and messaging app databases exported
- [ ] Location data extracted and cross-referenced with timeline
- [ ] Container audit logs collected if containers in scope
- [ ] Cloud storage access logs reviewed (S3 access logs, Azure Storage analytics)
