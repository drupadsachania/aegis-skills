# Detection Validation — Reference

Use this phase to prove the SIEM/SOC detection pipeline works end to end: that a known
technique produces telemetry, the telemetry becomes an alert, the alert reaches an
analyst, and the analyst acts. Detection content that was written but never exercised is
a hypothesis. This phase converts hypotheses into evidence.

## 1. The Pipeline Has Stages — Validate Each

An endpoint agent blocking a technique (see `endpoint-security` control-effectiveness)
is one thing; the *SOC* seeing and responding is another. The detection pipeline can
break at any stage, and each break has a different owner and fix.

```
TECHNIQUE EXERCISED
      ↓
TELEMETRY GENERATED    — did the source emit the event?            (sensor / log source)
      ↓
TELEMETRY INGESTED     — did it reach the SIEM, parsed?            (pipeline / parsing)
      ↓
DETECTION FIRED        — did a rule match?                         (detection content)
      ↓
ALERT RAISED           — did it surface to a queue, de-duped?      (alerting / tuning)
      ↓
ANALYST RECEIVED       — did a human/playbook pick it up?          (routing / staffing)
      ↓
RESPONSE TAKEN         — was action taken within SLA?              (process)
```

| Stage result | Values |
|--------------|--------|
| Telemetry | `GENERATED` · `NOT_GENERATED` |
| Ingestion | `INGESTED` · `DROPPED` · `UNPARSED` |
| Detection | `FIRED` · `NO_RULE` · `RULE_ERROR` |
| Alert | `RAISED` · `SUPPRESSED` · `BURIED` |
| Analyst | `RECEIVED` · `MISSED` |
| Response | `ACTIONED` · `NO_ACTION` |

Report the stage that broke, not just "not detected." The fixes are entirely different:
a `DROPPED` at ingestion is a pipeline problem; `NO_RULE` is a content problem;
`BURIED` is an alert-tuning problem; `MISSED` at the analyst stage is routing or
staffing. A single pass/fail hides which team needs to act.

## 2. Validation Record

Per technique exercised:

| Technique | Telemetry | Ingestion | Detection | Alert | Analyst | Response | Breaking stage | MTTD |
|-----------|-----------|-----------|-----------|-------|---------|----------|---------------|------|
| T1110 Password Spray | GENERATED | INGESTED | FIRED | RAISED | RECEIVED | ACTIONED | — (full) | 4 min |
| T1071 C2 over HTTPS | GENERATED | INGESTED | NO_RULE | — | — | — | Detection content | — |
| T1048 DNS Exfil | GENERATED | DROPPED | — | — | — | — | Ingestion (DNS logs not shipped) | — |

MTTD (time from technique to alert) and MTTR (alert to response) are measured here, from
real exercised events rather than estimated.

## 3. Detection Gaps Have Types

| Gap type | Symptom | Owner | Fix |
|----------|---------|-------|-----|
| Visibility | Telemetry never generated | Engineering | Enable the log source / sensor |
| Pipeline | Generated but dropped or unparsed | SIEM engineering | Fix routing / parser |
| Content | Ingested but no rule matched | Detection engineering | Write/adjust the rule |
| Tuning | Rule fired but alert suppressed or buried | Detection engineering | Fix thresholds / de-dup |
| Routing | Alert raised but no analyst saw it | SOC ops | Fix queue routing / coverage |
| Process | Analyst saw it, no action in SLA | SOC management | Playbook / staffing |

A "detection gap" reported without its type sends the wrong team to fix the wrong layer.

## 4. Tie to Attack Attempt and Controls

Detection validation is most powerful correlated with the attack attempt and the
endpoint control outcome, so one exercised technique produces a complete picture:

```
attack attempt (exposure-validation)
   → endpoint control outcome (endpoint-security control-effectiveness)
   → SOC detection pipeline (this phase)
   → tripwire signal (deception-engineering validation campaign, if placed)
```

When a deception tripwire is in the path, its firing is a high-confidence detection data
point — correlate it here (see `deception-engineering` validation-campaign-tripwires).

## 5. Regression and Drift

Detection content rots. Log sources get decommissioned, parsers break after a vendor
format change, rules get disabled during noise events and never re-enabled. Re-run
detection validation:

```
after a SIEM / pipeline change          after a log-source or format change
after detection-rule changes            periodically as baseline regression
after an analyst reports "we should have caught that"
```

A rule that fired last quarter and is `NO_RULE` or `DROPPED` this quarter is a
regression — coverage silently decayed.

## 6. Honest Reporting

Report what was exercised and observed, scoped to the environment and time. "We
validated 40 techniques; 31 produced an actioned alert, 5 failed at ingestion (DNS logs
not shipped), 4 had no detection content" is useful and true. "Our detection coverage is
78%" without saying which techniques, against which log sources, at what time, is a
number that cannot be acted on or trusted.

## ATT&CK Mapping
Detection validation exercises techniques across the matrix — commonly T1110
Brute Force, T1071 Application Layer Protocol, T1048 Exfiltration Over Alternative
Protocol, T1021 Remote Services, T1003 OS Credential Dumping — recording the pipeline
outcome per technique rather than a coverage percentage.
