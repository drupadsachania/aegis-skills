# Dynamic Analysis

## Purpose
Execute the sample in a controlled environment and capture runtime behaviour: API calls, network traffic, file/registry changes, child processes.

---

## 1. Sandbox Environment Configuration

### Pre-Execution Checklist
- [ ] VM snapshot taken (clean baseline)
- [ ] Network adapter set to host-only or isolated segment
- [ ] INetSim or FakeNet-NG running and listening
- [ ] Process Monitor (ProcMon) running with capture active
- [ ] Wireshark capturing on VM adapter
- [ ] x64dbg or WinDbg attached (optional for step-through)
- [ ] Sysmon installed with comprehensive config (SwiftOnSecurity or Olaf Hartong config)

### INetSim Configuration
```ini
# /etc/inetsim/inetsim.conf
start_service dns
start_service http
start_service https
start_service smtp
start_service ftp
dns_default_ip    <analysis-vm-ip>
http_static_dir   /var/lib/inetsim/http/fakefiles/
```

### FakeNet-NG (Windows)
```
fakenet.exe -c configs/default.ini
# Intercepts all outbound connections, responds with configurable responses
# Output: PCAP + console logs
```

---

## 2. Process Monitoring

### Process Monitor (ProcMon) Filters
```
Operation is RegSetValue     → Registry writes
Operation is WriteFile        → File writes
Operation is TCP Connect      → Network connections
Process Name is <sample>      → Scope to sample process
```

Key Sysmon Event IDs:
| Event ID | Description |
|----------|-------------|
| 1 | Process creation (command line, parent PID) |
| 3 | Network connection |
| 7 | Image loaded (DLLs) |
| 8 | CreateRemoteThread |
| 10 | Process access (OpenProcess with PROCESS_VM_WRITE) |
| 11 | File created |
| 12/13 | Registry create/set value |
| 22 | DNS query |

---

## 3. API Monitoring

### API Monitor (Windows)
```
1. Launch API Monitor → select process to attach or launch
2. Filter by API groups: Registry, File System, Network, Crypto, Process/Thread
3. Capture API call sequence with parameters and return values
```

### Frida Hooks (Cross-platform)
```javascript
// Hook CreateFileA
Interceptor.attach(Module.getExportByName('kernel32.dll', 'CreateFileA'), {
  onEnter: function(args) {
    console.log('[CreateFileA] filename:', args[0].readAnsiString());
  }
});

// Hook InternetConnectA
Interceptor.attach(Module.getExportByName('wininet.dll', 'InternetConnectA'), {
  onEnter: function(args) {
    console.log('[InternetConnectA] host:', args[1].readAnsiString(), 
                'port:', args[2].toInt32());
  }
});
```

```bash
frida -l hooks.js -f <sample.exe> --no-pause   # Launch and hook
frida -l hooks.js <pid>                          # Attach to running process
```

---

## 4. Network Traffic Capture and Analysis

### Wireshark Capture Filters
```
# Capture only from analysis VM
host <vm-ip>

# DNS queries only
udp port 53

# HTTP traffic
tcp port 80 or tcp port 443
```

### Tshark Analysis
```bash
tshark -r capture.pcap -Y "http" -T fields -e http.host -e http.request.uri
tshark -r capture.pcap -Y "dns.qry.name" -T fields -e dns.qry.name
tshark -r capture.pcap -Y "tcp.flags.syn==1 and tcp.flags.ack==0" \
  -T fields -e ip.dst -e tcp.dstport   # All new TCP connections
```

---

## 5. Dynamic Unpacking with Debugger

### OEP (Original Entry Point) Finding
```
1. Load sample in x64dbg
2. Set breakpoint on memory allocation: bp VirtualAlloc; bp VirtualProtect
3. Run → when VirtualProtect called with PAGE_EXECUTE, likely OEP nearby
4. Step through until JMP to unpacked code
5. Dump process memory: Scylla → Dump → Fix IAT → Dump to file
```

### Breakpoints for Common Anti-Analysis Bypass
```
# Anti-debug
bp IsDebuggerPresent
bp CheckRemoteDebuggerPresent
bp NtQueryInformationProcess    # ProcessDebugPort query

# Timing attacks
bp GetTickCount
bp QueryPerformanceCounter
bp Sleep
```

---

## 6. Persistence Mechanism Capture

Monitor for these persistence TTPs during dynamic analysis:

| Mechanism | Registry Key / Path | ATT&CK |
|-----------|--------------------|----|
| Run Key | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` | T1547.001 |
| RunOnce | `HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce` | T1547.001 |
| Scheduled Task | `C:\Windows\System32\Tasks\` + `schtasks` API | T1053.005 |
| Service Installation | `HKLM\SYSTEM\CurrentControlSet\Services\<name>` | T1543.003 |
| Startup Folder | `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` | T1547.001 |
| DLL Hijacking | Non-standard DLL path loaded at process start | T1574.001 |
| COM Object | `HKCU\Software\Classes\CLSID\` | T1546.015 |

---

## 7. Post-Execution Evidence Collection

```
# Collect from analysis VM before reverting snapshot
1. ProcMon save: File → Save → PML format
2. Wireshark save: File → Save As → PCAP format
3. Sysmon log export: wevtutil epl Microsoft-Windows-Sysmon/Operational sysmon.evtx
4. Prefetch: copy C:\Windows\Prefetch\<sample>*.pf
5. Registry hive export: reg export HKCU\Software sample_hkcu.reg
6. Memory dump: procdump.exe -ma <pid> memdump.dmp
```
