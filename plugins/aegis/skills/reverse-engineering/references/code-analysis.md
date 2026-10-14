# Code Analysis

## Purpose
Deep-dive into disassembled and decompiled code to understand functionality, identify key algorithms, map MITRE ATT&CK techniques, and detect anti-analysis measures.

---

## 1. Control Flow Graph Analysis

### Ghidra CFG Navigation
```
1. Functions window → double-click suspicious function
2. Graph → Function Graph (shows basic blocks and edges)
3. Look for:
   - Large number of basic blocks (complex logic)
   - Loops with arithmetic (crypto/encoding routines)
   - Multiple conditional jumps checking same variable (anti-analysis dispatcher)
   - Single large function (unpacker stub)
```

### Complexity Indicators
| Indicator | Implication |
|-----------|-------------|
| Cyclomatic complexity > 50 | Obfuscated or complex logic |
| Many indirect calls via register | Dynamic API resolution |
| Tight loop with XOR/ADD/ROR | Encryption or decoding |
| Function with single indirect JMP | Trampoline / hook |

---

## 2. Decompilation Review

### Ghidra Decompiler Tips
```
1. Right-click function → Decompile (Ctrl+E from listing view)
2. Rename variables: click variable → L (rename)
3. Retype variables: click variable → Ctrl+L (retype)
4. Create structure: Data → Create Structure at address
5. Override call signature: right-click call → Override Signature
```

### Hex-Rays (IDA Pro) Tips
```
// Set variable type
Alt+Q → enter type declaration

// Rename
N → rename variable or function

// Convert to struct access
T → set structure offset

// Force re-decompilation with type info
Ctrl+F5
```

---

## 3. Function Identification and Naming

### Crypto Function Recognition
| Pattern | Likely Algorithm |
|---------|-----------------|
| Constants 0x67452301, 0xEFCDAB89 | MD5 initialisation |
| Constants 0x6A09E667, 0xBB67AE85 | SHA-256 initialisation |
| S-Box 4×256 byte tables | AES |
| 256-byte key-scheduling loop | RC4 |
| Constants 0x61C88647 or 0x9E3779B9 | TEA/XTEA |
| 16-byte table lookup in 256-byte array | Serpent or Blowfish |

### Network Function Patterns
```
# Common C2 communication patterns:
- Socket creation: WSASocket/socket → connect/WSAConnect → send/recv
- HTTP API: InternetOpen → InternetConnect → HttpOpenRequest → HttpSendRequest
- Raw TLS: schannel InitializeSecurityContext + EncryptMessage
- Custom protocol: look for packet header construction (magic bytes + length)
```

---

## 4. Anti-Analysis Technique Detection

### Anti-Debug Techniques (T1622)
```assembly
; IsDebuggerPresent (direct PEB check)
mov eax, fs:[30h]       ; PEB pointer
movzx eax, byte [eax+2] ; BeingDebugged flag
test eax, eax
jnz <debug_detected>

; NtQueryInformationProcess ProcessDebugPort
push 0
push 4
push <output_var>
push 7              ; ProcessDebugPort class
push -1             ; Current process
call NtQueryInformationProcess

; Timing check
call GetTickCount
; ... code ...
call GetTickCount
sub eax, <first_value>
cmp eax, 1000       ; If > 1 second → debugger present
```

Bypass techniques in x64dbg:
```
ScyllaHide plugin → automatically patches anti-debug calls
Manually NOP out IsDebuggerPresent check
Set hardware breakpoint on PEB.BeingDebugged → patch to 0
```

### Anti-VM Techniques (T1497)
| Check | Method |
|-------|--------|
| CPUID hypervisor bit | `cpuid eax=1` → bit 31 of ECX |
| VMware registry keys | `HKLM\SOFTWARE\VMware, Inc.\VMware Tools` |
| VirtualBox files | `C:\Windows\System32\drivers\VBoxGuest.sys` |
| MAC address OUI | VMware: 00:0C:29, 00:50:56; VirtualBox: 08:00:27 |
| Process names | `vmtoolsd.exe`, `vboxservice.exe`, `vmsrvc.exe` |
| Screen resolution | 800×600 = typical fresh VM |

### Anti-Sandbox Techniques
| Technique | Description |
|-----------|-------------|
| Long sleep (T1497.003) | `Sleep(300000)` — 5 minutes |
| User interaction check | `GetCursorPos` — no mouse movement in sandbox |
| Recent file check | Count files in %TEMP%, %USERPROFILE%\Documents |
| Screen resolution check | < 800×600 = sandbox |
| Disk size check | < 60 GB = likely sandbox |
| Username/hostname check | Common sandbox names: `sandbox`, `malware`, `virus` |
| Loaded DLL count | < 100 loaded DLLs = sandbox |

---

## 5. Process Injection Analysis

### Injection Variants (T1055)
| Sub-Technique | API Sequence |
|---------------|-------------|
| T1055.001 DLL Injection | OpenProcess → VirtualAllocEx → WriteProcessMemory → CreateRemoteThread(LoadLibrary) |
| T1055.002 PE Injection | OpenProcess → VirtualAllocEx → WriteProcessMemory → CreateRemoteThread(entry) |
| T1055.003 Thread Hijacking | OpenProcess → OpenThread → SuspendThread → GetThreadContext → SetThreadContext → ResumeThread |
| T1055.012 Process Hollowing | CreateProcess(SUSPENDED) → ZwUnmapViewOfSection → VirtualAllocEx → WriteProcessMemory → SetThreadContext → ResumeThread |
| T1055.004 Asynchronous Procedure Call | OpenProcess → VirtualAllocEx → WriteProcessMemory → OpenThread → QueueUserAPC |
| T1055.013 Process Doppelganging | NtCreateTransaction → CreateFileTransacted → NtCreateSection → RollbackTransaction |

---

## 6. MITRE ATT&CK Technique Mapping

### Mapping Workflow
```
1. For each identified capability, map to ATT&CK technique
2. Note technique ID, sub-technique ID, and confidence level (High/Medium/Low)
3. Document evidence (function address, API call sequence, strings)
```

### Common Technique Mapping Table
| Code Pattern | ATT&CK Technique |
|-------------|-----------------|
| HTTP/HTTPS with custom headers | T1071.001 Web Protocols |
| DNS requests for encoded data | T1071.004 DNS |
| Hardcoded RC4/AES C2 comms | T1573.001 Symmetric Cryptography |
| Registry run key persistence | T1547.001 Registry Run Keys |
| Scheduled task creation | T1053.005 Scheduled Task |
| Shadow copy deletion (vssadmin) | T1490 Inhibit System Recovery |
| Process injection (any variant) | T1055 Process Injection |
| Credential API calls (LSASS) | T1003.001 LSASS Memory |
| System info collection | T1082 System Information Discovery |
| File/directory enumeration | T1083 File & Directory Discovery |
| Network share enumeration | T1135 Network Share Discovery |
| Self-delete on exit | T1070.004 File Deletion |
