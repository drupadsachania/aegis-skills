# Static Analysis

## Purpose
Extract maximum intelligence from the binary without executing it: strings, imports, headers, and structure.

---

## 1. Strings Extraction

```bash
# Basic strings extraction (ASCII + Unicode, min 6 chars)
strings -n 6 <sample>               # ASCII
strings -n 6 -el <sample>           # Unicode (little-endian)

# Windows: Sysinternals strings
strings.exe -a -n 6 <sample>

# FLOSS (FireEye Labs Obfuscated String Solver) — decodes obfuscated strings
floss.exe <sample>
floss --only-stack-strings <sample>   # stack-decoded strings only
```

### High-Value String Categories
| Category | Examples |
|----------|----------|
| C2 indicators | IP addresses, domains, URLs |
| File paths | `C:\Users\`, `%APPDATA%`, `C:\Windows\Temp\` |
| Registry keys | `HKCU\Software\`, `HKLM\SYSTEM\` |
| API names | `CreateRemoteThread`, `VirtualAllocEx`, `WriteProcessMemory` |
| Crypto constants | `AES`, `RC4`, magic constants (0x61C88647 for RC4) |
| Mutex names | Random-looking strings that could be mutex identifiers |
| User-agent strings | Reveal C2 framework (e.g., Cobalt Strike default UA) |

---

## 2. PE Header Analysis

```python
import pefile
pe = pefile.PE('<sample>')

# TimeDateStamp (compile time — may be spoofed)
import datetime
ts = pe.FILE_HEADER.TimeDateStamp
print(datetime.datetime.utcfromtimestamp(ts))

# Sections analysis
for section in pe.sections:
    name = section.Name.decode().rstrip('\x00')
    entropy = section.get_entropy()
    virt_size = section.Misc_VirtualSize
    raw_size = section.SizeOfRawData
    print(f"{name}: entropy={entropy:.2f}, virt={virt_size}, raw={raw_size}")

# Subsystem
subsystems = {2: 'GUI', 3: 'Console', 1: 'Native'}
print(subsystems.get(pe.OPTIONAL_HEADER.Subsystem, 'Unknown'))
```

### Suspicious Section Indicators
| Indicator | Meaning |
|-----------|---------|
| High entropy in `.text` | Code may be packed or encrypted |
| `.text` raw size much smaller than virtual size | Loader unpacks in memory |
| Section name not in standard set | Custom packer or malicious |
| Executable + writable section flags | Self-modifying code |

Standard sections: `.text`, `.data`, `.rdata`, `.rsrc`, `.reloc`, `.bss`

---

## 3. Imports/Exports Table Analysis

```python
# Import analysis
if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
    for entry in pe.DIRECTORY_ENTRY_IMPORT:
        print(entry.dll.decode())
        for imp in entry.imports:
            if imp.name:
                print(f"  {imp.name.decode()}")

# Export analysis (DLLs)
if hasattr(pe, 'DIRECTORY_ENTRY_EXPORT'):
    for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols:
        print(exp.name.decode() if exp.name else f"Ordinal #{exp.ordinal}")
```

### Capability Fingerprinting via Imports
| Import Category | Associated Capability |
|-----------------|----------------------|
| `VirtualAllocEx`, `WriteProcessMemory`, `CreateRemoteThread` | Process injection (T1055) |
| `GetProcAddress`, `LoadLibraryA` only | Dynamic API resolution (evasion) |
| `CryptAcquireContext`, `CryptEncrypt` | Encryption capability |
| `InternetOpenA`, `HttpSendRequestA` | HTTP C2 (T1071.001) |
| `WinExec`, `CreateProcessA`, `ShellExecuteA` | Code execution |
| `RegCreateKeyEx`, `RegSetValueEx` | Registry persistence (T1547) |
| `FindFirstFileA`, `ReadFile`, `CopyFileA` | File operations / staging |
| `NetShareEnum`, `WNetOpenEnum` | Network share enumeration (T1135) |

---

## 4. Ghidra Setup and Auto-Analysis

```
1. File → New Project → Non-Shared → select workspace directory
2. Import File → select sample → accept defaults
3. Double-click binary in project → open CodeBrowser
4. Analysis → Auto Analyze → check all relevant analyzers → Analyze
   Key analyzers: PCode Analyzer, Decompiler Parameter ID, Aggressive Instruction Finder
5. Window → Functions → review auto-identified functions
6. Search → For Strings → locate high-value strings, cross-reference to code
```

### Binary Ninja Quick Setup
```python
# Headless analysis
import binaryninja as bn
bv = bn.load('<sample>')
bv.update_analysis_and_wait()
for func in bv.functions:
    print(f"{func.start:#x}: {func.name}")
```

---

## 5. ELF Analysis

```bash
readelf -h <sample>          # ELF header (entry point, type, machine)
readelf -S <sample>          # Section headers
readelf -d <sample>          # Dynamic section (shared libraries)
readelf -s <sample>          # Symbol table
objdump -d <sample>          # Disassembly
ldd <sample>                 # Shared library dependencies (don't execute!)
```

---

## 6. YARA Rule Matching

```bash
# Scan with community rules
yara /path/to/rules/*.yar <sample>

# Scan with specific rule set
yara -r /path/to/rules/ <sample>

# Key rule repositories
# https://github.com/Yara-Rules/rules
# https://github.com/Neo23x0/signature-base
# https://github.com/mandiant/red_team_tool_countermeasures
```

---

## 7. Obfuscation Indicators Checklist

- [ ] Low import count (< 5 unique DLLs)
- [ ] GetProcAddress/LoadLibrary as primary imports
- [ ] High section entropy (> 7.0)
- [ ] Non-standard section names
- [ ] Large sections with mostly zeros in raw data
- [ ] No recognisable strings (encoded/encrypted)
- [ ] FLOSS recovers strings not found by standard `strings`
- [ ] Mismatch between file type detection and extension
