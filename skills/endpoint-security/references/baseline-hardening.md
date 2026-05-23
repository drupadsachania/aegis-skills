# Baseline Hardening — Reference

Use during Phase 2 to apply and verify OS-level hardening controls on endpoints.

## Windows Endpoint Hardening Controls

### Attack Surface Reduction (ASR) Rules

| Rule | GUID | ATT&CK Technique Mitigated | Mode |
|------|------|---------------------------|------|
| Block Office from creating child processes | D4F940AB-401B-4EFC-AADC-AD5F3C50688A | T1566 Phishing macros | Block |
| Block credential stealing from LSASS | 9E6C4E1F-7D60-472F-BA1A-A39EF669E4B0 | T1003.001 | Block |
| Block executable content from email/webmail | BE9BA2D9-53EA-4CDC-84E5-9B1EEEE46550 | T1566 | Block |
| Block untrusted/unsigned processes from USB | B2B3F03D-6A65-4F7B-A9C7-1C7EF74A9BA4 | T1091 | Block |
| Block JavaScript/VBScript launching executables | D3E037E1-3EB8-44C8-A917-57927947596D | T1059.005/007 | Block |
| Use advanced protection against ransomware | C1DB55AB-C21A-4637-BB3F-A12568109D35 | T1486 | Block |

Enable via Intune or GPO:
```powershell
Add-MpPreference -AttackSurfaceReductionRules_Ids <GUID> -AttackSurfaceReductionRules_Actions Enabled
```

### Credential Guard

```powershell
# Enable Credential Guard via registry (requires UEFI + Secure Boot)
reg add "HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard" /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Lsa" /v LsaCfgFlags /t REG_DWORD /d 1
```

## macOS Endpoint Hardening Controls

| Control | Implementation | ATT&CK Technique Mitigated |
|---------|---------------|---------------------------|
| FileVault 2 | System Preferences → Privacy & Security → FileVault | T1025 Data from Removable Media |
| Gatekeeper | `sudo spctl --master-enable` | T1204.002 Malicious File |
| System Integrity Protection | `csrutil enable` (recovery mode) | T1562.001 Disable Security Tools |
| Firewall enabled | `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on` | T1046 |
| Screen lock ≤ 5 mins | MDM profile or System Preferences | Physical access |
| Disable automatic login | System Preferences → Users & Groups | T1078 |
| Remote Apple Events disabled | `sudo systemsetup -setremoteappleevents off` | T1021 |

## Linux Endpoint Hardening

```bash
# Disable USB storage
echo 'blacklist usb-storage' >> /etc/modprobe.d/blacklist.conf
modprobe -r usb-storage

# Harden /proc
echo 'kernel.dmesg_restrict = 1' >> /etc/sysctl.d/99-hardening.conf
echo 'fs.protected_hardlinks = 1' >> /etc/sysctl.d/99-hardening.conf
sysctl --system
```

## Hardening Verification Checklist

| Control | Verification Command | Expected Result |
|---------|---------------------|----------------|
| Credential Guard | `msinfo32` → System Summary | Virtualization-based security: Running |
| ASR rules | `Get-MpPreference | select AttackSurfaceReductionRules*` | Enabled for each GUID |
| BitLocker | `manage-bde -status C:` | Protection Status: Protection On |
| FileVault | `fdesetup status` | FileVault is On |
