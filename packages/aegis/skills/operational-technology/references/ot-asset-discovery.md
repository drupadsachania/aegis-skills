# OT Asset Discovery

## Purpose
Build and maintain an accurate OT asset inventory using passive and carefully controlled active techniques, classified by Purdue model zone.

---

## 1. Critical OT Discovery Constraints

**NEVER perform active network scanning on live OT networks without:**
- Written change control approval
- Maintenance window scheduled during low-production period
- Process safety team sign-off
- Rollback plan documented
- OT engineer on-site during scan

Reason: Active scans can crash PLCs, disrupt SCADA communications, and cause
process upsets. Some legacy OT devices cannot handle any unsolicited network traffic.

---

## 2. Passive Discovery Techniques

### Network TAP/SPAN Port Monitoring
```
Method: Mirror OT switch traffic to monitoring device without any active injection

Setup:
  1. Request SPAN port configuration from OT network engineer (change control)
  2. Connect monitoring device (Claroty/Dragos/Nozomi sensor) to SPAN port
  3. Monitoring device passively analyses traffic for device identification
  4. Asset discovery from protocol analysis (no active scanning)

Tools:
  Claroty Continuous Threat Detection (CTD)
  Dragos Platform
  Nozomi Networks Guardian
  SecurityMatters/Forescout eyeSight OT
  
  Open source: Zeek + OT protocol plugins, Snort with OT rules
```

### Passive Asset Fingerprinting from Traffic
```
OT devices announce themselves via protocol traffic:
  Modbus TCP:       Function code 43 (Device ID) in responses
  EtherNet/IP:      Device identity object (ENIP list identity packets)
  PROFINET:         DCP (Discovery and Config Protocol) packets
  Siemens S7:       S7comm device info in handshake
  OPC-UA:           GetEndpoints response contains server info
  BACnet:           I-Am broadcast contains device info

Capture passively and extract:
  - IP address, MAC address, OUI (manufacturer from first 3 bytes)
  - Protocol(s) used
  - Vendor/model from protocol-specific fields
  - Firmware version (if exposed in protocol)
```

---

## 3. Purdue Model Zone Classification

### Purdue Reference Model Zones
| Level | Name | Devices | Description |
|-------|------|---------|-------------|
| Level 0 | Field Level | Sensors, actuators, motors, valves | Physical process devices |
| Level 1 | Control Level | PLCs, DCS controllers, RTUs, safety controllers | Automated process control |
| Level 2 | Supervisory Level | HMI workstations, SCADA servers, DCS servers | Human-machine interface |
| Level 3 | Operations Level | Historian servers, MES, engineering workstations | Site-wide operations |
| Level 3.5 | DMZ | Data historians (read-only copy), jump servers, remote access | IT/OT boundary |
| Level 4 | Business Network | ERP, email, corporate IT | Enterprise systems |
| Level 5 | Enterprise | Internet, cloud | External connectivity |

### Classification Criteria
```
For each discovered device, determine:
  1. Primary function: control, supervisory, operational, or enterprise
  2. Protocols used: OT protocols (Levels 0-3) vs IT protocols (Levels 4+)
  3. Communication patterns: talks to PLCs = Level 1-2 range
  4. Physical location: control room, substation, plant floor
  5. Owner: OT engineering vs IT

Document in asset register with Purdue level for zone and conduit design.
```

---

## 4. OT Protocol Reference

| Protocol | Default Port | Layer | Common Use |
|----------|-------------|-------|-----------|
| Modbus TCP | 502 | TCP | PLC/RTU polling; manufacturing, utilities |
| Modbus RTU | Serial | Serial | Same as Modbus TCP over serial |
| DNP3 | 20000 | TCP/UDP | SCADA/RTU comms; electric/water utilities |
| EtherNet/IP | 44818 | TCP/UDP | Allen-Bradley PLCs; manufacturing |
| Siemens S7 | 102 | TCP | Siemens PLCs (S7-300/400/1200/1500) |
| OPC-UA | 4840 | TCP | Interoperability; historian to SCADA |
| OPC-DA | 135 (DCOM) | TCP | Legacy OPC; Windows-based |
| PROFINET | 34962-34964 | UDP | Siemens/Phoenix Contact; manufacturing |
| BACnet | 47808 | UDP | Building automation (HVAC, lighting) |
| IEC 61850 | 102 (MMS) | TCP | Substation automation; power systems |
| IEC 60870-5-104 | 2404 | TCP | SCADA; power grid |
| ICCP (TASE.2) | 102 | TCP | Control centre to control centre; power |

---

## 5. Asset Register Template

```
Asset ID:          OT-<YYYY>-<nnn>
Hostname/Tag:      <device tag or hostname>
IP Address:        <IPv4>
MAC Address:       <MAC + OUI lookup>
Purdue Level:      0 / 1 / 2 / 3 / 3.5 / 4
Manufacturer:      <vendor>
Model:             <model>
Firmware Version:  <version>
Serial Number:     <serial>
Protocols:         <Modbus TCP, S7, EtherNet/IP, etc.>
OS:                <Windows XP SP3 / VxWorks 6.4 / N/A>
Function:          <PLC for Reactor A / HMI for Unit 3 / Historian>
Physical Location: <Building, Floor, Panel ID>
Network VLAN:      <VLAN ID>
Owner:             <OT Engineering contact>
Supported By:      <Vendor name + contract expiry>
Last Updated:      <YYYY-MM-DD>
Patch Status:      <Current / Behind / EOL/Unsupported>
NERC CIP BES:      <Yes/No — is this a BES Cyber System?>
```

---

## 6. Asset Discovery Checklist

- [ ] Change control approved for any active techniques
- [ ] SPAN port configuration documented and approved
- [ ] Passive monitoring sensor deployed and capturing
- [ ] Protocol analysis running (Claroty/Dragos/Nozomi or equivalent)
- [ ] All discovered assets classified by Purdue model level
- [ ] Asset register populated with all required fields
- [ ] Network topology diagram updated (Layer 2 and Layer 3)
- [ ] VLAN segmentation documented
- [ ] Unsupported/EOL assets flagged for risk assessment
- [ ] NERC CIP BES Cyber System categorisation completed (if applicable)
