# Resilience and Compliance

## Purpose
Build OT operational resilience through business continuity planning, backup procedures, and compliance with ISA/IEC 62443 and NERC CIP requirements.

---

## 1. ISA/IEC 62443 Security Level Targets

### Security Level Requirements Per Zone
```
Assign Security Level Targets (SL-T) based on zone criticality:

SL 1 (Basic protection):
  - Protection from accidental or unintentional violation
  - Use for: non-critical peripheral devices, display-only systems
  - Controls: basic password, logging

SL 2 (Protection against low sophistication intentional attack):
  - Defence against script-kiddie level attacks
  - Use for: standard control zones, supervisory zones
  - Controls: network segmentation, MFA for admin, monitoring

SL 3 (Protection against sophisticated intentional attack):
  - Defence against targeted attack with insider knowledge
  - Use for: high-criticality process control, safety systems vicinity
  - Controls: defence in depth, IDS, encrypted communications, privileged access management

SL 4 (Protection against state-sponsored level attack):
  - Defence against highly sophisticated, well-resourced attacker
  - Use for: safety instrumented systems, critical infrastructure
  - Controls: HSMs, air-gap or unidirectional gateway, advanced monitoring
```

---

## 2. NERC CIP Requirements

### Applicable Standards for BES Cyber Systems
| Standard | Title | Key Requirements |
|----------|-------|----------------|
| CIP-002-5.1a | BES Cyber System Categorisation | Identify and categorise BES Cyber Systems (High/Medium/Low) |
| CIP-003-8 | Security Management Controls | Senior management security plan; policies; exceptions |
| CIP-004-6 | Personnel & Training | Background checks; training; access management |
| CIP-005-6 | Electronic Security Perimeters | Define ESP; control all electronic access points; remote access |
| CIP-006-6 | Physical Security | Physical security of BES Cyber Systems |
| CIP-007-6 | Systems Security Management | Ports/services, patch management, malware prevention, logging |
| CIP-008-6 | Incident Reporting | Incident response plan; reporting timeline |
| CIP-009-6 | Recovery Plans | BCP/DR plans for BES Cyber Systems |
| CIP-010-3 | Configuration Change Management | Baseline configurations; change control; vulnerability assessments |
| CIP-011-2 | Info Protection | BES Cyber System Information (BCSI) protection |
| CIP-013-1 | Supply Chain Risk Management | Vendor risk management; software integrity |

### CIP-007 Systems Security Management Key Controls
```
CIP-007-R1: Ports and Services
  - Disable all unnecessary TCP/UDP ports on BES Cyber Systems
  - Document all enabled ports with business justification
  - Review quarterly

CIP-007-R2: Security Patches
  - Track security patches within 35 days of release
  - Apply patches or document mitigation within 35 days of release
  
  Patch SLA: 35 calendar days from ICS-CERT/vendor advisory to patch or mitigate

CIP-007-R3: Malware Prevention
  - Deploy malware prevention on all applicable assets
  - Update signatures every 35 days (or document why not feasible)
  
CIP-007-R4: Security Event Monitoring
  - Generate alerts for: authentication failures, account activity, detected malware
  - Review alerts within 15 minutes of generation (for High/Medium BES systems)
  - Retain logs for 90 days minimum

CIP-007-R5: System Access Controls
  - Enforce minimum password/access requirements
  - Limit unsuccessful logins (lock after 3-6 attempts)
  - Change vendor-supplied default passwords before deployment
```

---

## 3. Business Continuity for OT

### RTO/RPO for Control Systems
```
Define per zone (typical targets):
  Level 0-1 (Field/Control):
    RTO: 0-4 hours (process safety dependent; may need manual operation)
    RPO: Last known-good configuration backup

  Level 2 (Supervisory/HMI):
    RTO: 4-8 hours (operators can run on manual with Level 1)
    RPO: Configuration backup + historian data from last checkpoint

  Level 3 (Operations/Historian):
    RTO: 8-24 hours
    RPO: Last successful backup (daily minimum)

  Level 3.5 DMZ:
    RTO: 2-4 hours (critical for remote access recovery)
    RPO: Configuration + user accounts

Manual operation procedures:
  CRITICAL: All OT systems must have documented manual operation procedures
  Assumes: all SCADA/HMI systems completely unavailable
  Operators must be trained annually on manual operation
```

### PLC/HMI Configuration Backups
```
Backup requirements:
  Frequency: After every change (change control mandated); monthly minimum
  Format: Vendor-specific project file (STEP 7 .s7p, RSLogix .ACD, TIA Portal .zap)
  Verification: Hash backup immediately after creation; verify hash quarterly
  Storage: Offline storage (USB/removable media), physically separate from OT network
  Access: Controlled access; stored in secure location
  Retention: Last 5 versions minimum; archive 3 years

Backup procedure for Siemens S7-1500 (example):
  1. TIA Portal: Download project from PLC (Online > Device > Backup)
  2. Save to offline workstation
  3. sha256sum <project.zap> > project_hash.txt
  4. Transfer to secure offline storage with evidence number

Spare parts inventory:
  Maintain critical spares: spare PLC CPU, spare HMI server, critical I/O modules
  Spare inventory review: annual; update after hardware changes
  Supplier contracts: maintain support contract for critical components
```

---

## 4. Patch Management for OT

### OT Patch Challenges
```
Constraints:
  - Vendor approval required before applying patches (some patches void warranty)
  - Testing in replica environment required (cannot test on live production)
  - Maintenance window requirement (patch during planned production shutdown)
  - Legacy systems: no patches available (EOL/EOS)
  - Long patch cycles: semi-annual or annual production shutdowns may be the only window

Compensating controls for unpatched systems:
  1. Network isolation (no unnecessary connectivity)
  2. Application whitelisting (TXOne, Claroty Edge, Trellix)
  3. Virtual patching (IDS/IPS rule to block exploit traffic)
  4. Enhanced monitoring (alert on exploit attempt indicators)
  5. Documented risk acceptance by OT/plant management
```

### OT Patch Management Process
```
Step 1: Advisory received (ICS-CERT or vendor)
Step 2: Check asset register — is affected product installed?
Step 3: If yes: assess severity with OT context
Step 4: Contact vendor: is patch available? Is it approved for your version?
Step 5: Test in replica environment (mirror of production system)
Step 6: Schedule maintenance window; notify operations management
Step 7: Apply patch during window with engineer on-site
Step 8: Verify: test process functionality after patching
Step 9: Update asset register (patch version, date applied)
Step 10: If unable to patch: document compensating controls and risk acceptance
```

---

## 5. Resilience Checklist

- [ ] ISA/IEC 62443 SL-T assigned to each zone
- [ ] Current SL-C assessed; gaps to SL-T documented
- [ ] NERC CIP BES Cyber System categorisation completed (if applicable)
- [ ] CIP-002 categorisation documentation complete (High/Medium/Low)
- [ ] CIP-007 ports and services documented and reviewed
- [ ] CIP-007 patch tracking log current (within 35 days of advisories)
- [ ] CIP-007 security event monitoring configured and alert SLA met
- [ ] Manual operation procedures documented and operator-trained
- [ ] PLC/HMI configuration backups taken, hashed, and stored offline
- [ ] Spare parts inventory documented and physically held
- [ ] Backup restoration tested (annual minimum for critical systems)
- [ ] Patch management procedure documented with vendor approval workflow
- [ ] Compensating controls documented for all unpatched systems
- [ ] CIP-008 incident response plan current and tested (tabletop annually)
- [ ] CIP-009 recovery plan current and tested
