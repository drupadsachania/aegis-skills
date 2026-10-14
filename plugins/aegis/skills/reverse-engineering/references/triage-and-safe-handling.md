# Triage and Safe Handling

## Purpose
Establish safety controls, classify the sample type, and generate baseline metadata before any analysis begins.

---

## 1. Environment Setup

### Isolation Requirements
- **VM Snapshot**: Take a clean snapshot before any sample interaction. Use VMware or VirtualBox with host-only or isolated network.
- **Network Isolation**: Disable bridged/NAT adapters. Use host-only adapter only for INetSim/FakeNet-NG.
- **Shared Folders**: Disable all host↔guest shared folders to prevent escape.
- **Clipboard Sharing**: Disable bidirectional clipboard.

### Recommended Analysis VM Build
| Component | Recommendation |
|-----------|----------------|
| OS | Windows 10 LTSC (for Windows malware) or REMnux (Linux) |
| Snapshots | Clean baseline + post-tool-install baseline |
| Tools pre-installed | Ghidra, x64dbg, Process Monitor, Wireshark, FakeNet-NG |
| Network | INetSim or FakeNet-NG running before sample execution |

---

## 2. Safe File Transfer

- Transfer samples inside password-protected ZIP (`infected` as password — industry convention)
- Never open samples on a host machine
- Use USB or dedicated transfer mechanism with write-blocker if from physical media

---

## 3. Initial File Identification

### Magic Bytes (File Signature)
```
file <sample>                   # Linux/macOS
TrID <sample>                   # Windows — identifies file type from magic bytes
```

Common magic byte signatures:
| Signature (Hex) | File Type |
|----------------|-----------|
| 4D 5A (MZ) | PE executable (EXE/DLL/SYS) |
| 7F 45 4C 46 | ELF binary |
| 50 4B 03 04 | ZIP/DOCX/XLSX/JAR |
| 25 50 44 46 | PDF |
| D0 CF 11 E0 | MS Office OLE2 (legacy DOC/XLS) |
| 52 61 72 21 | RAR archive |

---

## 4. Hash Generation

Generate all standard hashes immediately upon receipt:
```powershell
# Windows PowerShell
Get-FileHash <sample> -Algorithm MD5
Get-FileHash <sample> -Algorithm SHA1
Get-FileHash <sample> -Algorithm SHA256

# Linux
md5sum <sample>
sha1sum <sample>
sha256sum <sample>

# Python (imphash for PE files)
import pefile, hashlib
pe = pefile.PE('<sample>')
print(pe.get_imphash())   # imphash
```

Cross-reference hashes:
- **VirusTotal**: `https://www.virustotal.com/api/v3/files/<sha256>`
- **MalwareBazaar**: `https://bazaar.abuse.ch/api/` (API search by hash)

---

## 5. Entropy Calculation

High entropy (> 7.0) indicates packing, encryption, or compression.

```
python3 -c "
import math, sys
data = open(sys.argv[1],'rb').read()
freq = [data.count(bytes([i]))/len(data) for i in range(256)]
entropy = -sum(p*math.log2(p) for p in freq if p > 0)
print(f'Entropy: {entropy:.4f}')
" <sample>
```

| Entropy Range | Interpretation |
|---------------|----------------|
| 0.0 – 5.0 | Normal compiled code |
| 5.0 – 7.0 | Compressed resources or mixed content |
| 7.0 – 8.0 | Packed, encrypted, or compressed section |

Tools: `binwalk -E <sample>` (per-section entropy plot), `PEiD`, `Detect-It-Easy (DiE)`

---

## 6. Packing Detection

```
Detect-It-Easy (DiE): die.exe <sample>         # identifies packer signatures
PEiD: <sample>                                   # signature-based packer ID
```

Common packers:
- **UPX**: Header magic `UPX0`/`UPX1` in section names; unpack with `upx -d <sample>`
- **MPRESS**: `.MPRESS1`/`.MPRESS2` sections
- **Themida/WinLicense**: Heavily obfuscated, requires manual unpacking
- **Custom packers**: No signature match, high entropy, few imports (usually GetProcAddress + LoadLibrary)

---

## 7. Code Signing Verification

```powershell
# Windows: check Authenticode signature
Get-AuthenticodeSignature <sample>

# sigcheck (Sysinternals)
sigcheck.exe -a -h <sample>
```

Note: Stolen or self-signed certificates are a red flag. Check certificate chain, issuer, and revocation status.

---

## 8. Initial Threat Classification

| Indicator | Possible Classification |
|-----------|------------------------|
| High entropy + few imports | Packed dropper |
| Office macro + download URLs | Phishing dropper |
| PE with network imports (WinINet/WinHTTP) | Downloader/backdoor |
| PE with crypto imports (CryptAcquireContext) | Ransomware/encrypted C2 |
| ELF with setuid or socket calls | Linux implant/rootkit |
| PDF with JavaScript | PDF exploit |

Document classification in analysis notes before proceeding.
