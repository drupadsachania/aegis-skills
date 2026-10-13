# Remediation Verification — Reference

Use during Phase 5 — the phase most programmes skip and the one that makes the whole
discipline credible. Finding and even confirming exposures proves a problem exists.
Verification proves it is gone. Without it, "remediated" means "someone closed a ticket."

## 1. Recommend, Then Separately Decide to Apply

Keep these apart:

```
recommend remediation          analysis: root cause, fix options, verification criteria
        ≠
execute remediation            a change, under change management and its own authorization
```

Generating a fix recommendation is safe analysis. Applying it is a production change
that needs its own approval, change window and rollback plan. Automatic remediation is
only ever appropriate under an explicit policy that pre-authorizes that specific action
on that specific class of asset — never as a default, and never decided by the analysis
layer on its own.

## 2. Remediation Recommendation Contents

| Element | Content |
|---------|---------|
| Root cause | The actual weakness, not the scanner's label |
| Recommended fix | The durable correction (patch, config change, code change) |
| Alternative mitigation | If the fix cannot ship immediately |
| Compensating control | Temporary reduction while the fix is pending — with its own validation |
| Verification procedure | Exactly how closure will be proven (drives Phase 5 retest) |
| Rollback considerations | What happens if the fix breaks the service |
| Verification criteria | The observable condition that means "closed" |

Integrate recommendations with ticketing, ITSM, CI/CD and configuration management so
the fix enters the normal change flow — but the platform recommends into that flow; it
does not reach around change management to apply changes itself.

## 3. The Verification Loop

After remediation is reported applied, prove it:

```
1. Re-discover asset state         — the asset may have changed or been rebuilt
2. Re-assess exposure              — is the vulnerable version/config actually gone?
3. Re-run the original validation  — the exact proof that confirmed the exposure
4. Compare control telemetry       — did detection change (better or worse)?
5. Compare attack paths            — did the fix close the onward path too?
6. Confirm the compensating control (if any) is still in place or no longer needed
7. Record before/after evidence    — both captured, both retained
8. Calculate risk delta            — risk_before vs risk_after (see risk-management)
9. Close or reopen                 — VERIFIED_CLOSED, or REOPENED with the reason
```

**Re-run the same proof that confirmed the exposure.** A different, weaker test does not
verify closure — it changes the question. If the original proof demonstrated a specific
effect, verification is that the same attempt no longer produces it.

## 4. Verification Output

```
previous_state:          CONFIRMED_EXPOSURE
current_state:           VERIFIED_CLOSED | PARTIAL | FAILED (→ REOPENED)
exploit_before:          true
exploit_after:           false
risk_before:             <from risk model>
risk_after:              <from risk model>
risk_delta:              <reduction, proven>
verification_confidence: <from evidence, Phase 4>
evidence:                [before_proof, after_proof, re-discovery, telemetry_diff]
```

`risk_delta` is the number leadership actually cares about: not how many vulnerabilities
were found, but how much exploitable exposure was proven to be removed.

## 5. Verification Outcomes

| Outcome | Meaning | Next |
|---------|---------|------|
| `VERIFIED_CLOSED` | Original proof no longer succeeds; exposure re-assessed gone | Close; keep evidence for audit |
| `PARTIAL` | Reduced but not eliminated (e.g. harder, or compensating-control-only) | Keep open; record residual risk and the compensating control |
| `FAILED` | The fix did not remove the proven exposure | `REOPENED`; recommendation was wrong or not actually applied |
| `REGRESSED` | Was closed, now exploitable again | `REOPENED`; investigate why (rollback, rebuild, drift) |

A "partial" that only has a compensating control in place is `CONTROLLED`, not closed —
the underlying weakness remains and the control itself needs periodic re-validation.

## 6. Continuous Regression

Verified-closed is not permanent. Re-validate when a trigger says the assumption behind
closure may no longer hold:

```
asset rebuilt or re-imaged        version rollback / dependency downgrade
configuration drift               new credential or trust relationship
infrastructure change             the exposure's technique seen newly weaponised
```

Event-driven re-validation beats blanket periodic retesting: re-test what changed, not
everything, every time. A case that silently regresses and is never re-tested is worse
than one never closed, because the dashboard now says it is safe.

## 7. Proving Risk Reduction Upward

The programme's headline claim is evidenced, not asserted:

> "At the start of the quarter, N exposures were confirmed exploitable to crown jewels.
> M have been remediated and verified closed — here is the before/after proof for each.
> Aggregate exploitable exposure to crown jewels fell by X%."

Every number in that sentence traces to a verification record with before/after
evidence. That is the difference between a security programme that reports activity and
one that reports outcomes.

## ATT&CK Mapping
Verification re-exercises the same technique the case proved (e.g. T1190, T1068) and
records that it no longer succeeds — the technique ID is retained with the before/after
evidence pair.
