# Safety Instrumented Systems (SIS) Security

## Purpose
Protect the Safety Instrumented Systems that bring a process to a safe state when limits are exceeded. SIS is the last line of defence against physical harm — a compromised SIS (as in the TRITON/TRISIS attack on a Triconex controller) can disable safety functions while the process runs, risking loss of life. Security controls here must never degrade the safety function itself.

---

## 1. SIS Fundamentals

| Concept | Definition |
|---------|-----------|
| SIF (Safety Instrumented Function) | A single function that detects a hazard and moves the process to a safe state (e.g., close feed valve on high pressure) |
| SIL (Safety Integrity Level) | 1–4; probability the SIF performs on demand. SIL 3 = 99.9–99.99% availability |
| SIS | The engineered system (sensors + logic solver + final elements) implementing the SIFs |
| Logic Solver | Safety PLC (Triconex, HIMA, Siemens S7 F-series, Rockwell GuardLogix) |
| Safe State | The condition the process is driven to (usually de-energised / shut down) |

**IEC 61511** governs functional safety for the process industry; **IEC 62443** governs the security of the same systems. Security failures are now recognised as a cause of safety failures.

---

## 2. SIS Threat Model

| Threat | Impact | ATT&CK for ICS |
|--------|--------|----------------|
| Reprogram safety logic solver | Safety function silently disabled | T0843 Program Download, T0889 Modify Program |
| Force SIS into program/maintenance mode | SIFs bypassed during "engineering" | T0858 Change Operating Mode |
| Manipulate safety setpoints | Trip points moved outside safe envelope | T0836 Modify Parameter |
| Spoof sensor input to logic solver | SIS never sees the hazard | T0856 Spoof Reporting Message |
| Disable annunciation to operators | Hazard hidden from the control room | T0832 Manipulation of View |
| TRITON-style RAT on engineering workstation | Persistent access to reprogram Triconex | T0866 Exploitation of Remote Services |

### TRITON / TRISIS Case Reference
The 2017 TRITON attack targeted Schneider Triconex SIS controllers via a compromised Windows engineering workstation, using the proprietary TriStation protocol (UDP/1502) to inject a payload into the safety controller. Detection cues: unexpected TriStation traffic, controller keyswitch left in PROGRAM, firmware/logic checksum drift from baseline.

---

## 3. SIS Security Controls (Without Compromising Safety)

```
Architectural isolation:
  [ ] SIS on a dedicated safety zone (Purdue Level 1) — physically or logically
      separated from the Basic Process Control System (BPCS)
  [ ] No routable path from IT or supervisory zones to the logic solver
  [ ] Engineering access to SIS only from a dedicated, hardened, offline-capable
      Safety Engineering Workstation (SEWS) — never a shared IT laptop

Keyswitch and mode discipline:
  [ ] Physical keyswitch on the logic solver kept in RUN; PROGRAM only during
      change-controlled maintenance, key held by the safety authority
  [ ] Alert on any electronic mode change (T0858) not paired with a work order

Integrity monitoring:
  [ ] Golden baseline of safety logic + firmware checksums; compare weekly
  [ ] Passive monitor for the SIS engineering protocol (TriStation/UDP 1502,
      HIMA, etc.) — any occurrence outside a window is an incident
  [ ] Change-detection alert on setpoint / parameter writes (T0836)
```

**Never** apply security controls that add latency or failure modes to the safety loop itself. Security monitoring is passive and out-of-band; it must not sit inline in the SIF signal path.

---

## 4. SIS Incident Response (Safety-First)

```
If SIS compromise is suspected, the process safety authority leads — not IT security.

CONTAIN (without creating a hazard):
  1. Do NOT power-cycle or "clean" the logic solver — this may drop the safety function
  2. Verify the SIS is still performing its SIFs (independent proof test if needed)
  3. Move keyswitch to RUN; revoke engineering-workstation access
  4. Isolate the engineering workstation (the usual entry point), not the SIS

INVESTIGATE:
  5. Capture logic-solver program + firmware; diff against golden baseline
  6. Pull engineering-workstation forensic image (TRITON persisted here)
  7. Review SIS engineering-protocol captures for unauthorised sessions

RECOVER:
  8. Restore verified-good safety logic during a planned shutdown / safe state
  9. Independent SIL verification / proof test before returning SIF to service
  10. Root-cause the IT→OT→SIS path; close the conduit that allowed reach
```

---

## 5. Compliance and Verification

| Requirement | Standard | Evidence |
|-------------|----------|----------|
| Independence of SIS from BPCS | IEC 61511 | Architecture drawing showing separation |
| Security risk assessment of the SIS | IEC 62443-3-2 | Zone/conduit model with SIS as its own SL-4 zone |
| Access control to safety logic | IEC 62443-3-3 SR 1.1 | Named accounts, keyswitch procedure, access logs |
| Change management for safety logic | IEC 61511 MOC | Signed management-of-change records |
| Proof testing after any change | IEC 61511 | Proof-test records with SIL verification |

---

## 6. ATT&CK for ICS Technique Coverage

T0800 T0803 T0813 T0816 T0832 T0835 T0836 T0839 T0843 T0855 T0856 T0857
T0858 T0859 T0866 T0868 T0872 T0873 T0880 T0881 T0889
