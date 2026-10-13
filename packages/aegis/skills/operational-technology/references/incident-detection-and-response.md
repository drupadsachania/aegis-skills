# Incident Detection and Response

## Purpose
Deploy OT-specific monitoring, detect anomalies in process behaviour, and respond to incidents with safety-first procedures.

---

## 1. OT-Specific Monitoring Platforms

### Passive Monitoring Tools
```
Dragos Platform:
  - Network traffic analysis; OT protocol deep inspection
  - Threat behaviour analytics (Dragos threat intelligence)
  - Activity groups (threat actor tracking)
  - Vulnerability management for OT assets
  - Passive only: no traffic injection

Claroty Continuous Threat Detection (CTD):
  - Asset inventory from passive traffic
  - Anomaly detection (baseline normal traffic patterns)
  - Policy-based alerting (new connections, unusual commands)
  - Integration with Claroty xDome for enterprise

Nozomi Networks Guardian:
  - Passive network monitoring
  - AI-based anomaly detection
  - Asset visibility and software inventory
  - OT protocol support: 80+ protocols

Critical OT monitoring principle:
  ALL monitoring must be PASSIVE (SPAN/TAP only)
  NEVER deploy active scanning agents directly to OT devices
  Active monitoring requires change control and maintenance window
```

---

## 2. Behavioural Anomaly Detection

### Baseline Normal Behaviour
```
Establish baselines for:
  1. Network traffic patterns:
     - Normal devices that communicate (source/destination pairs)
     - Normal protocols per device pair
     - Normal traffic volumes (bytes/packets per time period)
     - Normal communication times (engineering activity may be 8am-5pm)
  
  2. Process values (if historian data available):
     - Normal operating ranges for process variables (temperature, pressure, flow)
     - Normal rate of change for each variable
     - Alarm states and frequency

  3. Control commands:
     - Normal write frequency to PLC registers
     - Expected command sequences (start/stop sequences)
     - Normal HMI operator login times and actions
```

### Anomaly Alert Types
| Alert Type | Description | Severity |
|------------|-------------|---------|
| New device detected | Unknown IP/MAC appeared on OT network | High |
| Unusual engineering command | Write to PLC outside maintenance window | Critical |
| Protocol violation | Malformed or unexpected OT protocol traffic | High |
| New connection | First time communication between two devices | Medium |
| Scan activity | Rapid connection attempts to multiple devices | Critical |
| Excessive write commands | Write frequency exceeds baseline 3× | High |
| Control logic download | Firmware/logic change to PLC | Critical |
| Remote access outside window | Vendor connecting outside approved time | High |
| Process value out of range | Process variable beyond expected limits | High |

---

## 3. OT Incident Response Procedures

### Safety-First Principle
```
CRITICAL: Safety takes absolute priority over forensic preservation and
          IT/security investigation objectives.

Before any OT incident response action:
  1. Consult process safety engineer: is it safe to continue the process?
  2. Define safe state: what is the safe position for valves, pumps, etc.?
  3. Production continuity: what is the minimum required to continue safely?
  4. Only AFTER safe state established: begin security investigation

OT IR team composition:
  Security incident responder (lead for security actions)
  Process safety engineer (lead for safety decisions)
  OT/control systems engineer (lead for OT technical actions)
  Plant manager (authorise business decisions)
  Legal/compliance (if regulatory implications)
```

### OT IR Phases
```
Phase 1: Detection and Triage (0-2 hours)
  - Alert received from OT monitoring system
  - Verify alert: is this a security event or process event?
  - Assess safety impact: is the process in a safe state?
  - Activate OT IR team
  - Notify plant manager and CISO

Phase 2: Containment (2-8 hours)
  - Safety first: ensure safe state maintained
  - Network isolation: isolate affected OT zone from IT and internet
  - Remote access: suspend all remote access immediately
  - Preserve: take memory dumps and network captures before clearing
  - Assess production impact: can process continue safely?

Phase 3: Investigation (8-72 hours)
  - Analyse historian logs, HMI logs, network captures
  - Identify affected PLCs/HMIs (is logic modified?)
  - Verify process integrity: are sensor readings trustworthy?
  - Determine attack vector and timeline

Phase 4: Recovery
  - Restore from known-good PLC configuration backups
  - Verify restored logic against reference backups (hash comparison)
  - Gradual process restart with engineering supervision
  - Enhanced monitoring post-recovery (2-4 weeks)
```

---

## 4. OT Log Sources

### Available Log Sources by Level
| Source | Log Type | Key Information |
|--------|---------|----------------|
| HMI servers | Operator action logs | Who did what to which control |
| SCADA systems | Alarm and event logs | Process alarms, setpoint changes |
| Historians (OSIsoft PI, Aspentech IP21) | Process data + audit trails | Process values + access logs |
| Engineering workstations | Windows event logs | Who logged in, what tools used |
| Network devices (OT switches) | Syslog | New MAC addresses, port changes |
| Claroty/Dragos sensors | OT network events | All monitored OT network activity |
| Jump servers | Session logs + recordings | All remote access activity |

### Log Analysis for OT Incidents
```
Priority investigation areas:
  1. HMI audit logs: look for commands issued during the incident window
     - PLC write commands (setpoint changes, output commands)
     - Mode changes (manual vs automatic)
     - Alarm acknowledgements during incident

  2. Engineering workstation logs: look for:
     - PLC programming tool launches (STEP 7, RSLogix, etc.)
     - USB device insertions
     - Remote connections initiated
     - Downloads to PLCs (configuration change)

  3. Network captures: look for:
     - New connections established (especially from IT side)
     - Unusual OT protocol traffic (unexpected function codes)
     - Large data transfers from Level 0-2 devices
```

---

## 5. NERC CIP Incident Reporting

### Reporting Requirements
```
CIP-008-6: Incident Reporting and Response Planning

Reportable Incidents (to NERC/E-ISAC/CISA):
  - Any compromise or attempt to compromise the Electronic Security Perimeter (ESP)
  - Any compromise of an Electronic Access Control or Monitoring System (EACMS)
  - Any cyber incident impacting a BES Cyber System

Reporting timeline:
  Initial report: within 1 hour of discovery of a reportable cyber security incident
  to: electricity-isac@nerc.net and CISA at report@cisa.gov

  Note: "Reportable" includes attempted compromise, not just successful
```
