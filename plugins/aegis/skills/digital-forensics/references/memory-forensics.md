# Memory Forensics

## Purpose
Analyse RAM captures to detect malicious processes, network connections, injected code, credential material, and rootkit indicators that leave no disk trace.

---

## 1. Volatility 3 Plugin Workflow

### Initial Triage Sequence
```bash
# Step 1: Identify OS and build
vol -f memory.dmp windows.info

# Step 2: Running processes (flat list)
vol -f memory.dmp windows.pslist

# Step 3: Process tree (shows parent-child, orphaned processes)
vol -f memory.dmp windows.pstree

# Step 4: Network connections at time of capture
vol -f memory.dmp windows.netscan

# Step 5: Command lines (reveals encoded PS, LOLBins)
vol -f memory.dmp windows.cmdline

# Step 6: Find injected code (malfind)
vol -f memory.dmp windows.malfind

# Step 7: DLLs loaded per process
vol -f memory.dmp windows.dlllist --pid <pid>

# Step 8: Process handles (files, mutexes, pipes, events)
vol -f memory.dmp windows.handles --pid <pid>

# Step 9: File system objects
vol -f memory.dmp windows.filescan

# Step 10: Registry
vol -f memory.dmp windows.registry.hivelist
vol -f memory.dmp windows.registry.printkey --key "Software\Microsoft\Windows\CurrentVersion\Run"
```

---

## 2. Process Tree Anomaly Detection

### Legitimate Parent-Child Relationships
| Process | Expected Parent |
|---------|----------------|
| explorer.exe | userinit.exe |
| cmd.exe / powershell.exe | explorer.exe (interactive) or legitimate parent |
| svchost.exe | services.exe |
| lsass.exe | wininit.exe |
| csrss.exe | smss.exe |
| services.exe | wininit.exe |
| spoolsv.exe | services.exe |

### Suspicious Anomalies
| Observation | Suspicion |
|-------------|-----------|
| svchost.exe parent != services.exe | Masquerading (T1036.005) |
| lsass.exe not child of wininit.exe | LSASS impersonation |
| Multiple lsass.exe | LSASS dump/hollowing |
| cmd.exe or powershell.exe from svchost | Lateral movement or injection |
| Orphaned process (PPID not in process list) | Injection or parent process terminated |
| Process with unusual path (not System32) | Masquerading |

---

## 3. Network Connection Analysis

```bash
# All network connections
vol -f memory.dmp windows.netscan

# Output fields: Proto, Local, Foreign, State, PID, Owner, Created

# Key states to investigate:
# ESTABLISHED: active connection at capture time
# CLOSE_WAIT / TIME_WAIT: recently closed
# LISTENING: local server (potential backdoor)

# Filter for non-standard ports
vol -f memory.dmp windows.netscan | grep -vE ":(80|443|445|135|139|3389|53) "
```

---

## 4. Injected Code Detection — malfind

### Interpreting malfind Output
```
malfind output fields:
  PID, Process name, Virtual address, Size, Protection, Disassembly

High-confidence injection indicators:
  - MZ header (4D 5A) found in non-image VAD region
  - Region has PAGE_EXECUTE_READWRITE (0x40) or PAGE_EXECUTE_WRITECOPY
  - Region is private (not backed by file on disk)

False positive indicators:
  - Region is in a known .NET JIT compilation area
  - Disassembly shows unrecognisable data (not code)
  - Parent process is a known code-generating tool
```

```bash
# Dump suspicious regions for further analysis
vol -f memory.dmp windows.malfind --dump --output-dir /tmp/malfind/

# Hash and YARA scan dumped regions
sha256sum /tmp/malfind/*.dmp
yara -r /opt/rules/ /tmp/malfind/
```

---

## 5. Credential Extraction Artifacts

**Important: Credential extraction requires explicit legal authorisation.
Document authorisation reference in analysis notes before proceeding.**

```bash
# SAM database hashes (offline account hashes)
vol -f memory.dmp windows.hashdump

# LSA secrets (service account credentials, cached domain credentials)
vol -f memory.dmp windows.lsadump

# Cached domain credentials
vol -f memory.dmp windows.cachedump

# Note: These capabilities should only be used by:
# 1. Authorised forensic investigators with legal authorisation
# 2. Penetration testers with explicit written scope
# 3. Incident responders under explicit mandate
```

---

## 6. Rootkit Detection

### SSDT Hook Analysis
```bash
# Windows System Service Descriptor Table
vol -f memory.dmp windows.ssdt

# Clean system: all SSDT entries point to ntoskrnl.exe or win32k.sys
# Rootkit indicator: entry points to unknown driver or user-space address

# Output interpretation:
# Index | Function | Symbol | Owner
# 0     | NtAcceptConnectPort | ntoskrnl.exe | CLEAN
# 47    | NtCreateFile | rootkit.sys | SUSPICIOUS
```

### Kernel Callbacks
```bash
vol -f memory.dmp windows.callbacks

# Kernel callbacks used by rootkits:
# PsSetCreateProcessNotifyRoutine (process creation monitoring)
# PsSetCreateThreadNotifyRoutine (thread creation)
# PsSetLoadImageNotifyRoutine (image load)
# CmRegisterCallback (registry access)
# FsRtlRegisterFileSystemFilterCallbacks (filesystem filter)
```

### Hidden Objects Detection
```bash
# Compare pslist (walks PEB) vs psscan (scans pool tags)
# Processes in psscan but not pslist = hidden by DKOM
vol -f memory.dmp windows.pslist | awk '{print $1}' > pslist_pids.txt
vol -f memory.dmp windows.psscan | awk '{print $1}' > psscan_pids.txt
diff pslist_pids.txt psscan_pids.txt

# Modules comparison
vol -f memory.dmp windows.ldrmodules   # PEB module list
vol -f memory.dmp windows.modules      # kernel module list (pool scan)
# Discrepancy = hidden module
```

---

## 7. Memory Forensics Checklist

- [ ] OS version confirmed (windows.info)
- [ ] Process list + tree reviewed for anomalies
- [ ] Network connections enumerated and cross-referenced with threat intel
- [ ] Command lines extracted and decoded (base64/hex PS encoded commands)
- [ ] malfind complete; all suspicious regions investigated
- [ ] DLL lists reviewed for unusual entries (non-standard paths)
- [ ] File handles reviewed for suspicious named pipes
- [ ] Mutex handles documented (malware family fingerprinting)
- [ ] SSDT reviewed for hooks
- [ ] Kernel callbacks reviewed
- [ ] psscan vs pslist comparison for hidden processes
- [ ] Memory dumps hashed and YARA-scanned
- [ ] Credential extraction performed only with legal authorisation documented
