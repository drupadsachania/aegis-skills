# Traffic Analysis — Reference

Use during Phase 3 to identify anomalous traffic patterns indicative of adversary activity.

## Telemetry Sources

| Source | What It Provides | Collection Method |
|--------|-----------------|-------------------|
| NetFlow / IPFIX | Volume, direction, port, duration metadata | Flow exporter on routers/switches |
| DNS logs | Domain resolution history | Recursive resolver query logging |
| Proxy logs | HTTP/S URL, user-agent, response codes | Squid / Zscaler / Bluecoat |
| Firewall logs | Allow/deny decisions, NAT translations | Syslog / SIEM ingestion |
| PCAP | Full packet capture for deep inspection | Tap / SPAN port, Zeek/Suricata |
| VPC Flow Logs | Cloud east-west and north-south flows | AWS VPC Flow Logs / Azure NSG Flow |

## Beaconing and C2 Pattern Detection

| Pattern | Description | ATT&CK ID | Detection Query (SPL) |
|---------|-------------|-----------|----------------------|
| Regular interval DNS | Same domain queried every N seconds | T1071.004 | `index=dns \| bucket span=1m _time \| stats count by src_ip,query \| where count > 50` |
| Long-duration connections | Persistent TCP connection to unusual dest | T1071.001 | `index=netflow duration > 3600 dest_port IN (80,443,8080)` |
| Low-and-slow exfiltration | Small consistent outbound data volumes | T1030 | `index=netflow \| stats sum(bytes_out) by dest_ip \| where sum > 1000000` |
| DGA domains | High-entropy domain names with short TTL | T1568.002 | Entropy scoring on DNS query field |
| ICMP tunnelling | Unusually large ICMP payloads | T1095 | `index=netflow proto=1 bytes > 100` |
| SMB lateral movement | Internal SMB spikes between workstations | T1021.002 | `index=netflow dest_port=445 src_zone=users dest_zone=users` |
| DNS over HTTPS (DoH) | Bypasses DNS inspection | T1071.004 | Block non-authorised DoH resolvers (1.1.1.1:443 / 8.8.8.8:443) |

## Baseline Anomaly Approach

1. **Establish baseline** — collect 14 days of flow data during normal operations
2. **Profile per-host behaviour** — typical dest IPs, ports, data volumes, connection duration
3. **Alert on deviation** — flag hosts exceeding 3 standard deviations from baseline
4. **Prioritise by asset tier** — anomalies from Tier 1 assets (DCs, PAM) escalate immediately

## DNS Analysis Commands

```bash
# Extract top queried external domains from DNS logs
zeek-cut query < dns.log | sort | uniq -c | sort -rn | head 50

# Find high-entropy domain names (potential DGA)
python3 dga_entropy.py --threshold 3.5 --input dns.log
```
