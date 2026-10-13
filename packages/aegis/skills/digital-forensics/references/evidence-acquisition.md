# Evidence Acquisition

## Purpose
Acquire digital evidence in a forensically sound manner, maintaining chain of custody and ensuring legal admissibility.

---

## 1. Chain of Custody Documentation

### Chain of Custody Form Fields
```
Evidence Item ID:      <sequential ID, e.g. EV-2026-001>
Case Number:           <case reference>
Item Description:      <make/model/serial/hostname/IP>
Date/Time Acquired:    <UTC timestamp>
Location Acquired:     <physical address or logical location>
Acquired By:           <full name, role>
Method:                <dd imaging / FTK Imager / live acquisition>
MD5 Hash:              <hash of image>
SHA256 Hash:           <hash of image>
Witness:               <name of witness present>
Chain of Transfers:    [table: from/to/date/time/purpose/signature]
Storage Location:      <safe/evidence bag/digital vault>
```

Each time evidence changes hands, the chain of transfers table must be updated.

---

## 2. Write-Blocker Requirements

**Always use write-blockers for dead-box acquisition.**

Hardware write-blockers:
- Tableau Forensic Bridges (T8u, T35es, T3u for SATA/IDE/USB)
- WiebeTech Forensic UltraDock v5

Software write-blockers:
- Linux: `hdparm -r1 /dev/sda` (read-only mode)
- Windows: registry key `HKLM\SYSTEM\CurrentControlSet\Control\StorageDevicePolicies\WriteProtect = 1`

Verify write-blocker is functioning before imaging:
```bash
# Attempt write → should fail
dd if=/dev/zero of=/dev/sda bs=512 count=1   # Should return "permission denied"
```

---

## 3. Disk Imaging

### dd (Linux)
```bash
# Basic image
dd if=/dev/sda of=/mnt/evidence/hostname_disk.dd bs=512 conv=noerror,sync

# With progress
dd if=/dev/sda of=/mnt/evidence/hostname_disk.dd bs=512 conv=noerror,sync status=progress

# Compressed image
dd if=/dev/sda bs=512 conv=noerror,sync | gzip -9 > hostname_disk.dd.gz

# Verify hash during imaging (dcfldd)
dcfldd if=/dev/sda of=/mnt/evidence/hostname_disk.dd hash=sha256 \
  hashlog=/mnt/evidence/hostname_hash.log
```

### FTK Imager (Windows)
```
File > Create Disk Image > Physical Drive
Select drive > Add > E01 format > set case/evidence info
Set image fragment size (0 = single file)
Verify image after creation = YES (always)
Image type: E01 (Expert Witness) — preferred; or RAW (.dd)
```

---

## 4. Hash Verification

```bash
# Before imaging (source hash)
md5sum /dev/sda      # Note: hashing live device has race condition risk
sha256sum /dev/sda

# After imaging (image hash)
md5sum hostname_disk.dd
sha256sum hostname_disk.dd

# E01 format: FTK Imager verifies internally
# Manual E01 hash verification
ewfverify hostname_disk.E01
```

Source hash should match image hash. Any discrepancy = re-image or document reason.

---

## 5. Live Acquisition vs Dead-Box Decision

| Scenario | Recommendation |
|----------|----------------|
| Running system with potential memory artifacts | Live acquisition (RAM + disk) |
| System about to be powered off by others | Live RAM first, then disk image |
| Powered off system | Dead-box (write-blocker + imaging) |
| Virtual machine | Snapshot + VMDK/VHDX copy + RAM snapshot |
| Cloud instance | API-based snapshot; provider cooperation |
| Full-disk encryption (BitLocker) | Live acquisition ONLY; keys in memory |

### Live Memory Acquisition
```
# Windows — WinPmem
winpmem_mini_x64_rc2.exe -o hostname_mem.aff4
winpmem_mini_x64_rc2.exe -o hostname_mem.raw  # raw format

# Windows — DumpIt (Comae)
DumpIt.exe /output hostname_mem.dmp /quiet

# Linux — LiME (kernel module)
insmod lime-$(uname -r).ko "path=/mnt/usb/hostname_mem.lime format=raw"

# macOS — osxpmem
osxpmem.app/osxpmem -o hostname_mem.aff4
```

---

## 6. Evidence Packaging and Labeling

Physical media:
- Anti-static bags for drives/chips
- Evidence tape over USB/SATA ports
- Tamper-evident label with case ID and hash
- Documentation of physical condition on receipt (photos)

Digital evidence:
- Store images on forensically clean media (verify with zeros)
- Hash images and store hash file separately
- Encrypt images at rest (AES-256) for PII/PHI content
- Maintain access log (who accessed what image when)

---

## 7. Legal Hold Requirements

- Preserve all evidence in original state from legal hold notice date
- Do NOT wipe, re-image, or modify any system under legal hold
- Notify IT operations and HR of legal hold scope
- Document what was preserved vs. what was not available
- Retain evidence per jurisdiction and regulation:
  - US federal: up to 5 years (SOX), 7 years (financial records)
  - GDPR: only as long as necessary for legitimate purpose
  - Criminal matters: preserve indefinitely until case closure
