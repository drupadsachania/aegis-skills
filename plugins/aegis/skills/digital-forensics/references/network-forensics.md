# Network Forensics

## Purpose
Analyse network traffic captures to reconstruct attack timelines, identify C2 communications, detect lateral movement, and find data exfiltration.

---

## 1. PCAP Analysis with Wireshark / tshark

### Key Display Filters (Wireshark)
```
# HTTP requests
http.request

# DNS queries
dns.flags.response == 0

# SMB authentication (lateral movement indicator)
smb2.cmd == 1 or smb.cmd == 115

# Kerberos (T1550.003 Pass-the-Ticket)
kerberos

# All connections from specific host
ip.src == 192.168.1.100

# Large outbound transfers (exfiltration indicator)
ip.dst != 10.0.0.0/8 and tcp.len > 1000 and ip.src == 192.168.0.0/16

# TLS without SNI (unusual, may indicate C2)
tls.handshake.type == 1 and !tls.handshake.extensions_server_name
```

### tshark Command Reference
```bash
# Protocol statistics
tshark -r capture.pcap -z io,phs -q

# HTTP hosts and URIs
tshark -r capture.pcap -Y http.request -T fields \
  -e ip.src -e http.host -e http.request.uri -e http.user_agent

# DNS queries
tshark -r capture.pcap -Y "dns.flags.response==0" -T fields \
  -e frame.time -e ip.src -e dns.qry.name -e dns.qry.type

# Extract files from HTTP traffic
tshark -r capture.pcap --export-objects http,/tmp/http_objects/

# TLS/SSL certificates
tshark -r capture.pcap -Y ssl.handshake.type==11 -T fields \
  -e x509ce.dNSName -e pkix1explicit.serialNumber

# JA3 fingerprints
tshark -r capture.pcap -Y "tls.handshake.type==1" -T fields \
  -e ip.dst -e tls.handshake.ja3
```

---

## 2. C2 Traffic Pattern Identification

### Beaconing Detection
```python
# Detect regular beaconing by analysing inter-arrival times
import pyshark, statistics
from collections import defaultdict

cap = pyshark.FileCapture('capture.pcap', display_filter='tcp')
connections = defaultdict(list)

for pkt in cap:
    try:
        key = (pkt.ip.src, pkt.ip.dst, pkt.tcp.dstport)
        connections[key].append(float(pkt.sniff_timestamp))
    except: pass

for conn, times in connections.items():
    if len(times) > 5:
        intervals = [times[i+1]-times[i] for i in range(len(times)-1)]
        cv = statistics.stdev(intervals)/statistics.mean(intervals) if statistics.mean(intervals) > 0 else 999
        if cv < 0.3:   # Low variance = regular beaconing
            print(f"Beacon detected: {conn}, interval ~{statistics.mean(intervals):.1f}s, CV={cv:.3f}")
```

### JA3/JA3S Fingerprint Matching
Known malicious JA3 hashes:
| JA3 Hash | Associated Tool |
|----------|----------------|
| 51c64c77e60f3980eea90869b68c58a8 | Cobalt Strike default (pre-4.0) |
| 6bca5a11f8b9f0aa9900eee42dc98625 | Metasploit meterpreter |
| a0e9f5d64349fb13191bc781f81f42e1 | Go default TLS client |
| 771,4866-4865-4867:23-65281-10-11-35-16 | Python requests library |

```bash
# ja3er lookup (community database)
curl "https://ja3er.com/search/<ja3_hash>"
```

---

## 3. Lateral Movement Indicators

### SMB Lateral Movement (T1021.002)
```
Wireshark filter: smb2 and ip.src == <suspected_compromised_host>

Key SMB events to look for:
- NTLM authentication to multiple hosts in short time window
- Access to ADMIN$ or C$ shares
- File writes to \\<target>\ADMIN$\ (PsExec-style)
- DCE/RPC calls for service creation (T1570)
- Named pipe access for remote execution

# SMB authentication brute force pattern:
# Many failed auth (status: STATUS_LOGON_FAILURE) from same source
```

### WMI Lateral Movement (T1047)
```
WMI over network: DCOM on port 135 + dynamic high port
tshark filter: dcerpc and ip.src == <source>

WBEMPROX command execution signs:
- ExecMethod call for Win32_Process.Create
- Connection to port 135 then high dynamic port
```

### PsExec Artifacts (T1570)
```
Network indicators:
- SMB connection to ADMIN$ share
- File written: \\target\ADMIN$\PSEXESVC.exe
- Named pipe: \\target\pipe\PSEXESVC
- Service creation event (Security EID 7045)
```

---

## 4. Data Exfiltration Detection

### Volume-Based Detection
```bash
# Find large outbound transfers
tshark -r capture.pcap -z conv,tcp -q | sort -k8 -n -r | head -20
# Sort by bytes transferred; filter for external IPs

# Large DNS responses (possible DNS tunneling T1048.003)
tshark -r capture.pcap -Y "dns.resp.len > 200" -T fields \
  -e ip.src -e dns.qry.name -e dns.resp.len
```

### DNS Tunneling Detection
```python
# Suspicious indicators:
# 1. High query frequency to single domain
# 2. Queries with long subdomains (>50 chars)
# 3. Encoded data patterns in subdomain labels
# 4. Low TTL responses
# 5. TXT record responses with encoded data

# Example: base64 in DNS name
# aGVsbG8gd29ybGQ=.tunnel.attacker.com  ← obvious
# More subtle: hex encoding in subdomain labels
```

---

## 5. Protocol Reconstruction

### HTTP Session Reconstruction
```bash
# Follow specific HTTP stream
tshark -r capture.pcap -z follow,http,ascii,<stream_num> -q

# Extract specific file type
tshark -r capture.pcap -Y "http.content_type contains \"application/\"" \
  --export-objects http,/tmp/extracted/

# Decode gzip-encoded HTTP body
tshark -r capture.pcap -Y http -T fields -e http.file_data | xxd -r -p | gunzip
```

### SMTP Email Reconstruction
```bash
# Follow SMTP stream
tshark -r capture.pcap -z follow,tcp,ascii,<stream_num> -q

# Extract MIME attachments from SMTP
tcpflow -r capture.pcap -o /tmp/tcpflow/ port 25
# Then: munpack or ripmime for MIME extraction
```

---

## 6. Network Forensics Checklist

- [ ] PCAP collected with full packet capture (not sampled)
- [ ] Protocol statistics reviewed (io,phs)
- [ ] HTTP sessions extracted and files recovered
- [ ] DNS queries extracted (look for DGA, DNS tunneling)
- [ ] TLS fingerprints (JA3) checked against known-malicious list
- [ ] Beaconing analysis performed on outbound connections
- [ ] SMB/RPC lateral movement indicators checked
- [ ] Large outbound transfers investigated
- [ ] Passive DNS correlation: what IPs resolved to which domains
- [ ] All C2 indicators extracted and documented
