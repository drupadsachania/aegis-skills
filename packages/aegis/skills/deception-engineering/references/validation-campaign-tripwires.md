# Validation Campaign Tripwires — Reference

Use this phase when deception assets are deployed not only as standing defences but as
instrumentation inside a security-validation campaign. A tripwire in the attack path
turns "we think the SOC would catch this" into a recorded, high-confidence data point:
either the tripwire fired and the detection chain is proven, or it did not and there is a
measured gap.

## 1. Tripwire as a Control Under Test

Standing deception answers "did a real attacker touch this?" A validation-campaign
tripwire additionally answers "when we exercise an authorized test along this path, does
the tripwire → SIEM → SOC chain actually work end to end?" The same asset serves both;
the campaign use adds explicit correlation to the test.

```
Validation campaign
    ├── Attack test        (exposure-validation — authorized, scoped technique)
    ├── Endpoint control   (endpoint-security — prevention/telemetry outcome)
    ├── Tripwire           (this phase — a planted asset in the expected path)
    └── SOC detection      (security-operations — did the pipeline surface it?)
```

Correlating all four for one exercised technique gives a complete picture: ran or
blocked, seen by the endpoint, seen by the SOC, and whether the high-signal tripwire
fired.

## 2. Tripwire Object for a Campaign

A campaign tripwire carries the standard deception lifecycle plus explicit ties to the
validation case:

```
Tripwire
  ├── identity            unique, attributable to this placement
  ├── asset / placement   where it sits in the attack path under test
  ├── trigger             the specific interaction that fires it
  ├── expected telemetry  exact event the trigger should produce
  ├── SIEM destination    where that telemetry must arrive + the detection that should fire
  ├── campaign / case id  the exposure-validation case this supports
  ├── owner               who placed it and who is accountable
  └── lifecycle           deploy → monitor → correlate → retire
```

**Placement follows the path, not convenience.** A tripwire validates a detection chain
only if it sits where the technique under test would actually reach it — one hop along
the verified attack path (see `exposure-validation` impact-and-attack-paths), not parked
somewhere tidy.

## 3. Expected vs Observed — the Campaign Record

For each tripwire in a campaign:

| Field | Content |
|-------|---------|
| Case / campaign | The exposure-validation case |
| Placement | Where in the path, and why there |
| Trigger exercised | The authorized test action that should fire it |
| Expected telemetry | The event it should emit |
| Observed telemetry | What was actually recorded (`AS_EXPECTED` / `PARTIAL` / `NONE`) |
| SIEM ingestion | Did the event reach the SIEM, parsed? |
| Detection fired | Did the expected rule match? |
| SOC response | Did an analyst/playbook act, and in what time? |
| Outcome | `CHAIN_PROVEN` / `GAP_AT_<stage>` |

A tripwire that fires but whose event never reaches the SIEM is a pipeline gap found
cheaply — exactly the kind of silent break that standing-only deception would not
surface until a real incident.

## 4. Zero-False-Positive Still Holds

Campaign tripwires obey the same rule as standing deception: any legitimate interaction
is a critical failure (placement or believability error). Exercising it during a
campaign is a *deliberate, authorized, attributable* trigger — logged as such so it is
never confused with a real detection. Before the campaign, confirm no legitimate process
touches the asset; after, confirm the only triggers in the logs are the campaign's own.

## 5. Signal Validity Governs Interpretation

A tripwire's result is only as trustworthy as the signal chain carrying it. If the SIEM
destination has documented blind spots or immature integration (see this skill's
signal-source-validity phase), a "no detection" result may reflect the pipeline's known
weakness rather than a new finding. Record the signal-validity assessment alongside the
campaign result so a gap is attributed to the right cause.

## 6. Retirement and Reuse

Campaign tripwires are retired or rotated when the campaign ends — a tripwire whose
identity has been exercised in a known test is "burned" for authentic-attacker detection
until rotated. Track lifecycle so a decommissioned campaign does not leave stale,
known-to-testers assets behind masquerading as live tripwires.

## ATT&CK Mapping
Campaign tripwires most often instrument lateral-movement and credential-use paths —
T1021 Remote Services, T1550 Use Alternate Authentication Material, T1078 Valid
Accounts, T1087 Account Discovery — and map to MITRE Engage deception activities
(EAC0019 Lures, EAC0020 Network Manipulation) recorded with the campaign correlation.
