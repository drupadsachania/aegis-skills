# Signal Writing Guide for Deception Assets

Use this reference during Phase 7. Writing detection rules for deception assets
is fundamentally different from writing rules for real asset anomalies.
Understand the difference before writing a single rule.

---

## The Deception Rule Difference

Standard detection rule logic:
```
IF behaviour exceeds threshold THEN alert
IF behaviour deviates from baseline THEN alert
IF behaviour matches known-bad pattern THEN alert
```

Deception detection rule logic:
```
IF this specific asset is touched at all THEN CRITICAL
```

No threshold. No baseline. No frequency window. No correlation required.
The first event is always the only event you need. Write rules accordingly.

---

## Universal Rule Principles

1. **Zero baseline assumption.** No legitimate user or process should ever touch
   a deception asset. The expected event count is always zero. The first occurrence
   is always P0/Critical.

2. **Suppression immunity.** Deception rules must be excluded from all tuning exercises,
   suppression lists, and exclusion groups. Document this explicitly in every rule.
   Add a comment in the rule code: `# DO NOT SUPPRESS — DECEPTION ASSET`.

3. **Asset identity in the alert.** Every deception alert must output which specific
   asset was triggered (asset ID, asset type, zone) so the responder immediately
   knows what they're dealing with, not just that "something happened."

4. **Attacker attribution fields.** Every rule must capture: source IP or hostname,
   user account (if applicable), timestamp, and interaction type (connection attempt,
   file open, credential use, DNS lookup).

5. **Parallel out-of-band routing.** Even if the SIEM rule fires correctly, route
   deception hits to a secondary channel (webhook, email, PagerDuty) so a SIEM
   outage does not blind your deception layer.

---

## Rules by Platform

### Google Chronicle — YARA-L 2.0

**Honeytoken IAM credential usage:**
```
rule deception_aws_honeytoken_used {
  meta:
    author = "Security Engineering"
    description = "Deception: Fake AWS IAM credential used — confirmed threat"
    severity = "CRITICAL"
    priority = "P0"
    do_not_suppress = "true"
    deception_asset_id = "iam-honey-001"
    deception_zone = "Cloud"

  events:
    $e.metadata.event_type = "USER_LOGIN"
    $e.principal.user.userid = /AKIA[A-Z0-9]{16}FAKE/
    // Replace regex with exact honeytoken access key ID

  condition:
    $e
}
```

**Honeypot SSH connection:**
```
rule deception_ssh_honeypot_connection {
  meta:
    author = "Security Engineering"
    description = "Deception: SSH connection to internal honeypot — confirmed breach indicator"
    severity = "CRITICAL"
    priority = "P0"
    do_not_suppress = "true"
    deception_asset_id = "ssh-honey-int-001"

  events:
    $e.metadata.event_type = "NETWORK_CONNECTION"
    $e.target.ip = "10.10.4.50"          // Replace with honeypot IP
    $e.target.port = 22
    $e.network.direction = "INBOUND"

  condition:
    $e
}
```

**Fake AD service account authentication:**
```
rule deception_ad_honeyadmin_auth {
  meta:
    description = "Deception: Fake AD admin account authenticated — confirmed credential abuse"
    severity = "CRITICAL"
    priority = "P0"
    do_not_suppress = "true"
    deception_asset_id = "ad-honey-svc-001"

  events:
    $e.metadata.event_type = "USER_LOGIN"
    $e.principal.user.userid = "svc-cad-sync-backup"  // Replace with honeyaccount name
    $e.metadata.product_name = "Microsoft Active Directory"

  condition:
    $e
}
```

**Honeytoken document opened:**
```
rule deception_honeytoken_document_open {
  meta:
    description = "Deception: Monitored document opened — possible exfiltration in progress"
    severity = "CRITICAL"
    priority = "P0"
    do_not_suppress = "true"
    deception_asset_id = "doc-honey-ip-001"

  events:
    $e.metadata.event_type = "NETWORK_HTTP"
    $e.target.url = /.*token-id\.canarytokens\.com.*/  // Replace with your callback domain

  condition:
    $e
}
```

---

### Sigma (Platform-Agnostic)

**Template: Any deception asset interaction**
```yaml
title: Deception Asset Triggered
id: <generate-uuid>
status: stable
description: >
  A monitored deception asset has been accessed. Any interaction with this
  asset confirms malicious activity — no false positives expected.
  DO NOT SUPPRESS.
author: Security Engineering
date: <date>
tags:
  - deception
  - confirmed_threat
  - attack.credential_access
  - attack.lateral_movement
logsource:
  category: <adjust per asset type: network_connection / authentication / file_access>
detection:
  selection:
    <field>: <honeyasset_identifier>
    # Examples:
    # DestinationIp: '10.10.4.50'           # Honeypot IP
    # UserName: 'svc-cad-sync-backup'        # Honey AD account
    # TargetFilename|contains: 'ECU_Firmware_CONFIDENTIAL'  # Honey document
  condition: selection
falsepositives:
  - None expected. Any match is a confirmed deception trigger.
level: critical
fields:
  - SourceIp
  - SourceHostname
  - UserName
  - Timestamp
  - DeceptionAssetId
```

---

### Splunk SPL

**Honeypot connection rule:**
```
index=network sourcetype=firewall
dest_ip="10.10.4.50"
| eval deception_asset="ssh-honey-int-001", deception_zone="Internal", severity="CRITICAL"
| table _time src_ip src_port dest_ip dest_port deception_asset deception_zone severity
| sendalert <alert_action>
```

**Honeytoken AD account auth:**
```
index=windows EventCode=4624 OR EventCode=4648
TargetUserName="svc-cad-sync-backup"
| eval deception_asset="ad-honey-svc-001", severity="CRITICAL", do_not_suppress="true"
| table _time host TargetUserName LogonType IpAddress deception_asset severity
```

**Honeytoken file document open (DNS callback via proxy logs):**
```
index=proxy sourcetype=bluecoat
cs_uri_query=*canarytokens*
| rex field=cs_uri_query "(?<token_id>[a-z0-9]{20})"
| lookup deception_registry token_id OUTPUT asset_name zone
| eval severity="CRITICAL"
| table _time c_ip cs_username cs_uri_query token_id asset_name zone severity
```

---

### Microsoft Sentinel — KQL

**Honeytoken IAM or service account:**
```kql
let honeytokenUsers = dynamic(["svc-cad-sync-backup", "svc-plc-monitor-backup"]);
SecurityEvent
| where EventID in (4624, 4648, 4768, 4769)
| where TargetUserName in (honeytokenUsers)
| extend DeceptionAsset = "ad-honey-svc", DeceptionZone = "Identity/AD", Severity = "Critical"
| project TimeGenerated, Computer, TargetUserName, LogonType, IpAddress, DeceptionAsset, Severity
```

**Honeypot network connection:**
```kql
let honeypotIPs = dynamic(["10.10.4.50", "10.20.3.99"]);
AzureNetworkAnalytics_CL
| where DestIP in (honeypotIPs)
| extend DeceptionAsset = "network-honeypot", Severity = "Critical"
| project TimeGenerated, SrcIP, SrcPort, DestIP, DestPort, DeceptionAsset, Severity
```

---

### AWS CloudTrail — Direct Alert (No SIEM Dependency)

Set up CloudWatch Events rule for immediate honeytoken alert:

```json
{
  "source": ["aws.iam", "aws.sts"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "userIdentity": {
      "accessKeyId": ["AKIAIOSFODNN7HONEY1"]
    }
  }
}
```

Route: CloudWatch Events Rule → SNS Topic → PagerDuty/Email/Webhook.
This fires within seconds, completely independent of SIEM.

---

## Alert Output Standard

Every deception alert, regardless of platform, must produce these fields in the output:

| Field | Description | Example |
|-------|-------------|---------|
| `deception_asset_id` | Unique ID from deception registry | `ssh-honey-int-001` |
| `deception_type` | Asset type | `honeypot / honeytoken / breadcrumb` |
| `deception_zone` | Zone from Phase 1 | `Internal Network` |
| `source_ip` | Originating IP | `10.1.5.43` |
| `source_host` | Originating hostname (if resolvable) | `eng-laptop-D234` |
| `source_user` | Account used (if applicable) | `jsmith@corp.com` |
| `interaction_type` | What the attacker did | `SSH connect / cred use / file open / DNS lookup` |
| `timestamp_utc` | Event time in UTC | ISO 8601 |
| `severity` | Always CRITICAL | `CRITICAL` |
| `do_not_suppress` | Flag for tuning exclusion | `true` |
| `ir_playbook` | Which IR playbook to invoke | `IRP-DECEPTION-001` |

---

## Rule Maintenance Schedule

Deception rules require periodic maintenance. Add to operational runbook:

**Monthly:**
- Verify each deception rule still fires (trigger from controlled source)
- Verify alert reaches secondary channel (webhook/email)
- Confirm no suppression rules have been added that affect deception rules

**Quarterly:**
- Review honeytoken identifiers — rotate if environment has changed
- Reassess zone postures if new assets or signal sources have been added
- Update Sigma rules if source log formats have changed

**On IR engagement:**
- After any incident involving a deception hit, review whether the asset design
  should be updated based on what the attacker did or avoided
- Check if additional breadcrumbs are warranted based on the observed attack path
