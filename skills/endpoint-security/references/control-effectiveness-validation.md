# Control Effectiveness Validation — Reference

Use this phase to answer a question deployment status cannot: *when a known technique is
exercised against this endpoint, what does the control actually do?* An EDR that is
installed, healthy and reporting can still miss the technique that matters. "Deployed" is
an inventory fact; "effective" is a tested one.

## 1. Outcomes Are Independent — Never One Boolean

For each technique exercised against an endpoint, record the outcome at every stage
separately. Collapsing them into "EDR passed" throws away exactly the information that
makes the result useful.

```
ATTEMPT
   ↓
EXECUTION RESULT    — did the action run at all?
   ↓
PREVENTION RESULT   — was it blocked / killed?
   ↓
TELEMETRY RESULT    — was an event recorded?
   ↓
ALERT RESULT        — did an alert fire?
   ↓
SOC RESPONSE RESULT — did a human/playbook act?
```

| State | Meaning |
|-------|---------|
| `EXECUTED` | The action ran |
| `BLOCKED` | Prevented before completing |
| `LOGGED` | Telemetry recorded, whether or not it alerted |
| `DETECTED` | The telemetry was recognised as suspicious |
| `ALERTED` | An analyst-visible alert fired |
| `CONTAINED` | A response acted (isolation, kill, quarantine) |
| `MISSED` | None of the above — the technique ran unseen |

The difference between these is the whole point:

- `BLOCKED` — prevention worked; the technique never completed.
- `EXECUTED + LOGGED + ALERTED` — not prevented, but the SOC gets a chance.
- `EXECUTED + LOGGED + not ALERTED` — the data exists but nothing surfaced it: a tuning
  gap, not a visibility gap. Fixable by a detection rule.
- `EXECUTED + MISSED` — the worst case. No prevention, no telemetry, no chance. A true
  blind spot that needs a sensor or configuration change, not a rule.

"EDR passed" cannot distinguish a block from a silent miss. Record the stages.

## 2. Outcome Matrix

Per technique, per endpoint (or endpoint group):

| Technique | Execution | Prevention | Telemetry | Alert | Response | Outcome | Gap type |
|-----------|-----------|-----------|-----------|-------|----------|---------|----------|
| T1055 Process Injection | EXECUTED | — | LOGGED | ALERTED | — | Detected, not prevented | Prevention tuning |
| T1003 Credential Dumping | — | BLOCKED | LOGGED | ALERTED | — | Prevented | None |
| T1112 Modify Registry | EXECUTED | — | LOGGED | — | — | Logged only | Detection rule missing |
| T1070 Indicator Removal | EXECUTED | — | — | — | — | Missed | Sensor/visibility gap |

The **gap type** column drives different fixes: a missing detection rule is a content
change; a visibility gap needs telemetry the sensor is not collecting; a prevention gap
is a policy decision (block vs. monitor).

## 3. Map Validated Behaviour to MITRE ATT&CK

Store per test so results aggregate into coverage, not anecdotes:

```
technique_id · subtechnique_id · test_id · asset / group
EDR vendor · EDR version · sensor config profile
execution_result · prevention_result · telemetry_result · alert_result · response_result
timestamp · evidence_reference
```

This enables honest views:

| View | Question answered |
|------|------------------|
| Technique coverage | Which ATT&CK techniques are prevented / detected / missed on this fleet? |
| Version regression | Did an agent update change an outcome from DETECTED to MISSED? |
| Host-specific weakness | Is one group configured weaker than the baseline? |
| Config-profile comparison | Does the "performance" profile drop detections the "balanced" one keeps? |

## 4. Report Observed Results, Not Product Verdicts

A result is scoped to *this technique, this version, this configuration, this fleet* at
*this time*. It is not a verdict on the product's overall quality.

- Correct: "On v7.2 with the balanced profile, T1003.001 was BLOCKED and T1070.004 was
  MISSED on the engineering group, 2026-10-02."
- Overreach: "Vendor X fails at credential protection."

Vendor-to-vendor comparison is legitimate only within the exact same technique set,
versions and configurations — and still reports what was observed in that scope, never a
general claim about which product is "better." The configuration and version often
matter more than the vendor.

## 5. Regression Over Time

Control effectiveness decays silently. Agent updates, policy changes, OS updates and
config drift can all turn a detection off without anyone deciding to. Re-run the outcome
matrix:

```
after every agent version change        after a detection-policy change
after an OS feature/update that moves telemetry
periodically as a baseline regression (monthly for crown-jewel groups)
```

A technique that was `DETECTED` last quarter and is `MISSED` this quarter is a
regression to investigate — the fleet got quietly weaker and the dashboard would not
have told you.

## 6. Relationship to Exposure Validation

This phase produces the **detection** dimension for `exposure-validation` cases. When a
confirmed exposure is exercised, the per-stage outcome here populates that case's
detection state (`PREVENTED` / `DETECTED` / `LOGGED_ONLY` / `MISSED`) — so the exposure
record carries not just "was it exploitable" but "did we see it." For SIEM/SOC-side
detection validation (telemetry → alert → analyst response across the pipeline, not just
the endpoint agent), see `security-operations` detection-validation.

## ATT&CK Mapping
T1055 Process Injection · T1003 OS Credential Dumping · T1112 Modify Registry ·
T1070 Indicator Removal on Host · T1053 Scheduled Task/Job · T1547 Boot/Logon Autostart ·
T1562 Impair Defenses · T1218 System Binary Proxy Execution — each recorded with the
per-stage outcome actually observed, not an assumed one.
