# Endpoint DLP (USB / Clipboard / Print / Screenshot) — Reference

Use during Phase 3 to control data leaving through the endpoint — the "data in use" layer.
Endpoint DLP sees content before it hits the network and covers offline channels the
network never sees (USB, print, local sync).

## 1. Endpoint Channel Control Matrix

| Channel | Risk | Control | ATT&CK |
|---------|------|---------|--------|
| USB / removable media | Bulk offline exfil | Block write to unencrypted USB; allowlist by device ID; force encryption | T1052 Exfil over Physical Medium |
| Clipboard | Copy Restricted → personal app | Block clipboard from managed→unmanaged app; log large copies | T1115 Clipboard Data |
| Print | Print sensitive docs | Block/limit printing of Restricted labels; watermark; log | T1074 Data Staged |
| Screenshot / screen capture | Screen-scrape data | Block capture on Restricted windows; watermark screen | T1113 Screen Capture |
| Local sync clients | Personal Dropbox/Drive on device | Block install / egress of unsanctioned sync agents | T1567.002 |
| Local staging + archive | Zip before exfil | Alert on mass file access + archive creation | T1560 Archive Collected Data |
| Bluetooth / AirDrop | Peer exfil | Disable or restrict on managed devices | T1052 |

## 2. Agent Policy Design

```
Modes (roll out in this order to avoid business disruption):
  1. Monitor (audit)   — log only; establish baseline + tune false positives (4–6 weeks)
  2. Warn (soft)       — user prompt + justification on Restricted action; log override
  3. Block (hard)      — deny the action for Restricted data / unmanaged destinations

Policy anchored on the Phase-1 label (MIP/Purview, Google label) travelling with the file,
so the agent enforces on classification — not by re-scanning every file each time.

Common agents: Microsoft Purview Endpoint DLP, Forcepoint, Symantec DLP,
CrowdStrike/Zscaler endpoint DLP, Trellix.
```

## 3. Content-Aware Rules

| Rule | Trigger | Action |
|------|---------|--------|
| Restricted → USB | Copy file labelled Restricted to removable media | Block + alert |
| >N PII records to any egress | Structured data threshold (e.g., 100 PANs) | Block + escalate |
| Secrets/keys in clipboard or file | API key / high-entropy pattern | Block + alert SecOps |
| Source code → personal repo/USB | Proprietary fingerprint match | Block + alert |
| Mass file access anomaly | 100s of files opened in minutes | Alert (insider/ransomware precursor) |

## 4. Insider Threat & Departing Employees

```
Elevated monitoring triggers (risk-based, with HR/legal approval):
  - Resignation submitted / performance plan / access-revocation pending
  - Access to Restricted data outside normal role pattern
  - Off-hours bulk downloads, archive creation, USB attempts

Departing-employee DLP protocol:
  [ ] Increase monitoring sensitivity for the notice period
  [ ] Review 90-day file access + egress history
  [ ] Block USB write + personal cloud sync
  [ ] Disable access promptly on last day; preserve endpoint forensic image
```

## 5. Coverage & Hardening Gaps

```
[ ] Agent tamper protection on (users can't kill the DLP service)
[ ] Coverage report: % of managed endpoints with a healthy agent (target >98%)
[ ] BYOD / unmanaged devices: no Restricted access, or via VDI/MAM only
[ ] Offline policy cache so controls apply without network connectivity
[ ] macOS + Linux coverage, not just Windows (common blind spot)
```

## ATT&CK Mapping
T1052 Exfiltration Over Physical Medium · T1052.001 USB · T1115 Clipboard Data · T1113 Screen Capture · T1074 Data Staged · T1560 Archive Collected Data · T1005 Data from Local System · T1119 Automated Collection
