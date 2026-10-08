# Network DLP (Egress / DNS / TLS) — Reference

Use during Phase 2 to control data leaving over the network — the layer most email/endpoint
DLP products ignore. Covers egress filtering, TLS inspection, DNS exfiltration, and
protocol-level controls.

## 1. Egress Architecture

```
Principle: all outbound traffic through a controlled, inspected chokepoint.
No direct internet from servers or user subnets — force through proxy/SWG.

                [ User / Server subnets ]
                          │
                 [ Forward proxy / SWG ]  ← TLS inspection + DLP engine
                          │
                 [ Egress firewall ]      ← default-deny; allowlist destinations
                          │
                     [ Internet ]

Controls:
  [ ] Default-deny egress firewall; allowlist required destinations/ports
  [ ] All web traffic via SWG (Zscaler / Netskope / Palo Alto / Cisco Umbrella)
  [ ] Block direct-to-IP HTTPS that bypasses proxy
  [ ] Restrict outbound to known-bad categories + newly-registered domains
```

## 2. TLS Inspection (Break-and-Inspect)

```
Most exfil is inside TLS — without inspection, network DLP is blind.

  [ ] Deploy TLS inspection at the SWG with an internal CA trusted by managed endpoints
  [ ] Bypass (do not decrypt) privacy/regulated categories: banking, health, legal
  [ ] Enforce certificate pinning exceptions via managed allowlist
  [ ] Alert on TLS to destinations with self-signed / mismatched certs (C2 indicator)

Deep content inspection on decrypted flows:
  - Match classified-data patterns (PAN, PII, secrets, fingerprints) in HTTP bodies
  - Block uploads of Restricted-labelled content to unsanctioned destinations
  - Cap/inspect large POST/PUT bodies to file-sharing and paste sites
```

## 3. DNS Exfiltration Control

DNS is a favourite covert channel because it is often unfiltered (T1048.003, T1071.004).

| Signal | Detection | Response |
|--------|-----------|----------|
| High-entropy subdomains | Shannon entropy > 3.5 on labels | Block domain; alert |
| Excessive TXT / NULL queries | Rate + record-type baseline | Rate-limit; sinkhole |
| Long query names / high volume to one domain | Bytes-per-domain over time | Block; investigate host |
| DNS-over-HTTPS to non-approved resolvers | Block 1.1.1.1:443 / 8.8.8.8:443 unless sanctioned | Force internal resolver |

```
Controls:
  [ ] Force all DNS through internal resolvers; block external DNS egress
  [ ] Enable DNS RPZ + threat-intel feed (block known exfil/C2 domains)
  [ ] Log all DNS; run entropy + volume analytics (Zeek dns.log, Splunk)
  [ ] Block or tightly control DoH; only approved DoH resolvers
```

## 4. Protocol & Channel Controls

| Channel | Risk | Control |
|---------|------|---------|
| FTP/SFTP to external | Bulk exfil | Block external FTP; SFTP only to allowlisted partners |
| Personal webmail | Attachment exfil | Block via SWG category; or read-only |
| Cloud file-sharing (Dropbox, WeTransfer, personal Drive) | Upload exfil | Block unsanctioned; allow corporate tenants only (tenant restrictions) |
| Paste sites (pastebin) | Secret/code leak | Block category; inspect POST bodies |
| ICMP / non-standard ports | Tunnelling | Egress firewall: block; alert on payload anomalies |
| Messaging (Telegram, Discord) | Covert exfil | SWG category control; inspect where policy allows |

## 5. Network Exfiltration Analytics

```
Baseline then alert on deviation (per host, per data class):
  - Outbound bytes per host far above baseline (low-and-slow and bulk)
  - New external destinations from a host that never talks externally
  - Data volume to cloud-storage domains after a large internal read
  - After-hours large transfers from privileged accounts

SIEM correlation:
  index=proxy OR index=netflow
  | stats sum(bytes_out) as out by src_ip, dest_domain
  | where out > baseline*3
```

## ATT&CK Mapping
T1041 Exfiltration Over C2 · T1048 Exfiltration Over Alternative Protocol · T1048.003 Unencrypted Non-C2 · T1071.004 DNS · T1567 Exfiltration Over Web Service · T1567.002 Exfil to Cloud Storage · T1572 Protocol Tunneling · T1090 Proxy
