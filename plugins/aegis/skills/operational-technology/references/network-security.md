# Network Security

## Purpose
Design and implement OT network security using ISA/IEC 62443 zone and conduit model, DMZ architecture, and unidirectional data flow for IT/OT convergence points.

---

## 1. ISA/IEC 62443 Zone and Conduit Model

### Security Levels (SL)
| Level | Protection Against | Typical Controls |
|-------|-------------------|-----------------|
| SL 1 | Accidental or incidental violation | Basic authentication, logging |
| SL 2 | Intentional violation with simple means, low motivation | Strong auth, network segmentation, monitoring |
| SL 3 | Intentional violation with sophisticated means | Multi-factor auth, intrusion detection, encryption |
| SL 4 | Sophisticated attack with extended resources (nation-state) | Advanced cryptography, physical isolation, HSMs |

### Zone Design Principles
```
Zone = group of logical or physical assets that share the same security requirements
       and have common threat exposure and acceptable risk

Zone design steps:
  1. Group assets by function AND security level requirement
  2. Define Security Level Target (SL-T) for each zone
  3. Identify existing controls; determine Security Level Capability (SL-C)
  4. Gap: SL-C < SL-T → remediation required

Example zones:
  Safety Zone (SL-T 3-4):    SIS, safety PLCs — highest isolation
  Control Zone (SL-T 2-3):   PLCs, DCS controllers
  Supervisory Zone (SL-T 2): HMI servers, SCADA
  Operations Zone (SL-T 2):  Historians, engineering workstations
  DMZ (SL-T 2-3):            Data diodes, jump servers, remote access
```

### Conduit Security
```
Conduit = communication path between zones
          Each conduit must have controls matching the LOWER SL-T of the two zones

Conduit controls:
  Firewall/DMZ:         Filter traffic at zone boundaries (whitelist protocols)
  Data diode:           Hardware-enforced one-way flow (highest assurance)
  Application proxy:    Only approved protocols pass; deep inspection
  Encryption:           TLS 1.2+ for conduits crossing zone boundaries
  Authentication:       All conduits require authentication (no anonymous connections)

Document each conduit:
  Source zone, Destination zone, Protocol allowed, Direction, Firewall rule ID
```

---

## 2. IT/OT Convergence Risk Points

### High-Risk Convergence Points
| Convergence Point | Risk | Mitigation |
|------------------|------|-----------|
| Historian server (reads from OT, accessible by IT) | IT compromise reaches OT | Data diode; read-only historian; DMZ placement |
| Engineering workstation (programs PLCs, has IT access) | Malware path from IT to PLC | Dedicated OT laptop; no IT network connection; removable media policy |
| Remote access (VPN/RDP to OT network) | Direct OT network access | Jump server in DMZ; MFA; session recording; time-limited |
| Business intelligence (BI tools reading SCADA data) | OT data exposure; reverse connection | One-way data diode; data mirror in IT DMZ only |
| Patch server (WSUS for OT Windows machines) | Malicious patch or connection path | Dedicated WSUS in OT zone; no direct internet; tested patches only |

---

## 3. DMZ Design for IT/OT

### Recommended OT DMZ Architecture
```
Enterprise Network (IT)
        |
   [IT Firewall]
        |
   [ OT DMZ ]
   ┌────────────────────────────────────────────────────┐
   │  Jump Server (MFA required; session recording)      │
   │  Data Historian Mirror (read-only copy; passive)    │
   │  Remote Access Gateway (with MFA)                   │
   │  Patch Management Server (tested patches only)      │
   │  Antivirus Update Server (signature distribution)   │
   └────────────────────────────────────────────────────┘
        |
   [OT Firewall] (whitelist rules only; deny-all default)
        |
   OT Network (Levels 0-3)
```

### Firewall Rules (OT Firewall — Whitelist Approach)
```
Rule design: DEFAULT DENY ALL; allow only specific required communication

Example rules:
  ALLOW  Historian Mirror → OT Historian: TCP 5450 (OSIsoft PI OPC) — unidirectional via diode
  ALLOW  Jump Server → HMI: RDP TCP 3389 — only from jump server
  ALLOW  Patch Server → OT Windows: TCP 8530 (WSUS) — initiating from OT side
  DENY   IT Network → OT Network: ALL — except via jump server
  DENY   OT Network → Internet: ALL — no direct internet access from OT

Document every rule:
  Rule ID, Source, Destination, Protocol/Port, Direction, Justification, Owner, Date Added
```

---

## 4. Unidirectional Gateways (Data Diodes)

### When to Use Data Diodes
```
Use data diodes when:
  - Historian data must flow to IT/enterprise (one-way: OT → IT)
  - Threat intelligence feeds into OT SIEM (one-way: IT → OT)
  - OT audit logs sent to IT SIEM (one-way: OT → IT)

Vendors:
  Waterfall Security Solutions: Unidirectional Security Gateway
  Owl Cyber Defense (now part of Parsons): Owl Data Diode
  Nexor: Cyber Gateway
  Fox-IT: DataDiode

Key property: hardware-enforced one-way optical link; no software bypass possible
              Even if compromised software is installed, data cannot flow backwards
```

---

## 5. Remote Access Controls for OT

### Secure Remote Access Architecture
```
Requirements for all OT remote access:
  1. All access via jump server in OT DMZ — no direct connectivity
  2. MFA required for all remote access (hardware token preferred for vendors)
  3. Session recording for all privileged remote sessions
  4. Time-limited access windows (not 24/7 standing access)
  5. Vendor access: approved per maintenance request; auto-expire after task

Jump server configuration:
  - Hardened OS (Windows Server Core or Linux minimal)
  - No local admin for vendors (domain-controlled accounts only)
  - Application whitelisting (only approved OT tools available)
  - USB port disabled
  - Session recording: keystroke + screen (full capture)
  - Network access limited to specific OT assets for specific vendor

Vendor remote access SLA:
  Access request submitted: minimum 24h notice (emergency: 4h with manager approval)
  Access window: maximum 4h per session; renewable with approval
  Access logs: retained 12 months minimum
```
