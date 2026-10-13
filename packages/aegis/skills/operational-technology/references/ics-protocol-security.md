# ICS Protocol Security

## Purpose
Assess and harden the industrial protocols that carry control traffic between field devices, controllers, and supervisory systems. These protocols were designed for reliability on isolated networks and mostly lack authentication, integrity, or encryption — making protocol-aware attacks the core of ICS threat modelling under MITRE ATT&CK for ICS.

---

## 1. Industrial Protocol Threat Matrix

| Protocol | Transport | Auth | Encryption | Primary Attack | ATT&CK for ICS |
|----------|-----------|------|-----------|----------------|----------------|
| Modbus TCP | TCP/502 | None | None | Unauthorised command write to coils/registers | T0855 Unauthorized Command Message |
| DNP3 | TCP/UDP 20000 | Optional (SAv5) | None (native) | Spoofed control, replay, outstation flooding | T0856 Spoof Reporting Message |
| Siemens S7comm / S7comm-plus | TCP/102 (ISO-TSAP) | Weak (S7comm), token (plus) | None / weak | PLC stop/start, program upload/download | T0843 Program Download |
| EtherNet/IP (CIP) | TCP/UDP 44818, 2222 | None | None | Forward-open flooding, tag manipulation | T0855 |
| OPC-UA | TCP/4840 | Cert/user (if enabled) | TLS (if enabled) | Downgrade to None security policy, cert bypass | T0885 Commonly Used Port |
| IEC 61850 MMS/GOOSE | TCP/102, L2 GOOSE | None (GOOSE) | None | GOOSE spoofing → false trip of protection relays | T0832 Manipulation of View |
| PROFINET | L2 Ethernet | None | None | DCP device reset, real-time frame injection | T0814 Denial of Service |
| BACnet | UDP/47808 | None | None | Write-property to building controllers | T0855 |

---

## 2. Modbus Security Assessment

### Passive Identification (safe on live networks)
```
Passive Modbus discovery via SPAN/TAP — never active-scan live OT:
  - Capture TCP/502 with Zeek + ICSNPP-Modbus parser or Wireshark modbus dissector
  - Enumerate function codes in use:
      FC01/02  Read Coils / Discrete Inputs
      FC03/04  Read Holding / Input Registers
      FC05/06  Write Single Coil / Register    ← state-changing
      FC15/16  Write Multiple Coils / Registers ← state-changing
      FC08     Diagnostics                      ← can force listen-only / restart
  - Map unit IDs (slave addresses) to physical devices
```

### Risk Findings
| Finding | Risk | Remediation |
|---------|------|-------------|
| Write function codes (05/06/15/16) reachable from supervisory or IT zone | Attacker can actuate process (open valve, trip breaker) | Restrict writes to control zone; deploy Modbus-aware firewall (deep-packet function-code filtering) |
| No function-code filtering at conduit | Any client can issue any command | Whitelist read-only FCs across zone boundaries |
| Modbus over routable network to Level 0/1 | Direct field-device exposure | Terminate Modbus at a data-diode-fronted gateway |

---

## 3. DNP3 Hardening (Electric / Water Utilities)

```
DNP3 Secure Authentication (SAv5 / IEEE 1815-2012):
  - Enable challenge-response HMAC on critical control operations (SBO — Select Before Operate)
  - Rotate update keys; store in HSM where the outstation supports it
  - Enforce SBO for all direct-operate control points (Group 12 CROB)

DNP3 attack signatures to alert on (Zeek ICSNPP-DNP3):
  - Unsolicited responses from an outstation that was not configured for them
  - Cold restart (FC 13) / warm restart (FC 14) from an unexpected master
  - Disable unsolicited (FC 21) followed by control — hides operator view (T0856)
```

---

## 4. Siemens S7 / PROFINET

```
S7comm PLC protection:
  - Set PLC protection level 3 (write + read protection) in TIA Portal / STEP 7
  - Enable "know-how protection" and copy protection on program blocks
  - Disable the web server and OPC-UA server on the CPU if unused
  - Block TCP/102 across all conduits except the engineering-workstation conduit

TRITON/Stuxnet-class indicators:
  - Unexpected program download (T0843) outside a change window
  - Firmware version mismatch between running CPU and golden baseline
  - CPU mode change to STOP (T0813 Denial of Control) not tied to an operator action
```

---

## 5. OPC-UA Secure Configuration

```
OPC-UA is the modern, securable protocol — but ships insecure by default:
  [ ] Reject SecurityPolicy = None; require Basic256Sha256 or Aes256Sha256RsaPss
  [ ] Require application-instance certificates; disable "trust all"
  [ ] Enable user authentication (X.509 or username) — never Anonymous on control servers
  [ ] Turn off the discovery endpoint's anonymous session
  [ ] Monitor for downgrade attempts (client requesting None after negotiating signed)
```

---

## 6. Protocol-Aware Monitoring

| Sensor | Coverage | Deployment |
|--------|----------|-----------|
| Zeek + ICSNPP parsers | Modbus, DNP3, S7comm, EtherNet/IP, BACnet, PROFINET | SPAN/TAP at each zone conduit — passive only |
| Nozomi / Claroty / Dragos | Asset + protocol baseline, anomaly on new command | Passive collectors per Purdue level |
| Snort/Suricata ICS rulesets | Known exploit signatures (Talos ICS category) | Inline at IT/OT DMZ only, passive in OT |

**Golden rule:** all OT protocol assessment is **passive** (SPAN/TAP capture) unless an active test is explicitly change-controlled inside a maintenance window with the process in a safe state.

---

## 7. ATT&CK for ICS Technique Coverage

T0800 T0801 T0802 T0803 T0804 T0806 T0807 T0809 T0811 T0813 T0814 T0815
T0820 T0826 T0827 T0831 T0832 T0835 T0836 T0839 T0843 T0845 T0846 T0855
T0856 T0857 T0858 T0859 T0860 T0861 T0866 T0868 T0885 T0886 T0889
