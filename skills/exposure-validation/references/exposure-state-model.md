# Exposure State Model — Reference

Use during Phase 1 to represent every exposure as a case with independent,
evidence-backed dimensions and an explicit lifecycle. The state model is the backbone
of the whole programme: if it collapses distinct claims into one field, every report
built on it inherits the confusion.

## 1. The Exposure Case

The exposure case — one vulnerability on one asset in one business context — is the
unit of work. Not the CVE, not the scan, not the ticket.

| Field group | Contents |
|------------|----------|
| Identity | case_id, tenant/organisation, asset_id, verified asset identity, business service |
| Vulnerability | finding_id, CVE, KEV status, threat signals (each with source + timestamp) |
| Independent states | exposure, exploitability, impact, detection, remediation, verification, risk |
| Authority | authorization context, test scope, approved validation profile |
| Evidence | references to append-only evidence records |
| Lifecycle | workflow state, owner, timestamps, full transition history |

**Record history, don't overwrite it.** Every state change is an appended event with
actor, reason, evidence and time. "What did we believe on 14 March, and why?" must be
answerable months later — auditors, regulators and incident reviews will ask.

## 2. Independent Dimensions

Each dimension answers a different question and carries its own evidence.

| Dimension | Question | Values |
|-----------|----------|--------|
| Exposure | Does the vulnerability apply to this asset, and is it reachable? | `NOT_APPLICABLE` · `NO_EXPOSURE` · `POTENTIAL_EXPOSURE` · `VALIDATION_REQUIRED` |
| Exploitability | Was exploitation demonstrated in the authorized environment? | `CONFIRMED` · `NOT_EXPLOITABLE` · `NOT_VALIDATED` · `UNKNOWN` |
| Impact | What can an attacker reach from here? | `CROWN_JEWEL_REACHABLE` · `LIMITED` · `CONTAINED` · `UNKNOWN` |
| Detection | Did controls see it? (per control, see detection skills) | `PREVENTED` · `DETECTED` · `LOGGED_ONLY` · `MISSED` · `NOT_TESTED` |
| Remediation | What has been done? | `NONE` · `COMPENSATING_CONTROL` · `IN_PROGRESS` · `APPLIED` |
| Verification | Has the fix been proven? | `NOT_VERIFIED` · `VERIFIED_CLOSED` · `PARTIAL` · `FAILED` |

A case can legitimately be `CONFIRMED` exploitable, `CONTAINED` in impact and
`DETECTED` — which prioritises very differently from `CONFIRMED`, `CROWN_JEWEL_REACHABLE`
and `MISSED`. A single severity field cannot express that difference.

### What each exposure value requires

| Value | Minimum evidence |
|-------|-----------------|
| `NOT_APPLICABLE` | Authoritative software inventory showing an unaffected version, platform or configuration |
| `NO_EXPOSURE` | Affected, but the vulnerable component is provably unreachable (network path evidence, disabled feature, removed listener) |
| `POTENTIAL_EXPOSURE` | Affected version present and a plausible reachable path |
| `VALIDATION_REQUIRED` | Potential exposure on an asset important enough, or a threat signal strong enough, to justify an authorized test |

**Never mark exposure confirmed from scanner output alone.** Scanners infer from
banners and version strings; backported patches, disabled modules and compensating
controls routinely make the inference wrong in both directions.

## 3. Lifecycle State Machine

```
DISCOVERED
    │
ASSESSED ──────────────► NO_EXPOSURE ─────────────► (monitor for change)
    │
POTENTIAL_EXPOSURE
    │
VALIDATION_PENDING ─────► BLOCKED   (authorization, scope or identity missing)
    │
VALIDATION_RUNNING
    │
    ├──► CONFIRMED_EXPOSURE
    │         │
    │    IMPACT_ASSESSED ───► DETECTION_GAP   (controls missed it — tracked in parallel)
    │         │
    │    REMEDIATION_REQUIRED
    │         │
    │    REMEDIATION_IN_PROGRESS ──► CONTROLLED   (compensating control, risk accepted)
    │         │
    │    RETEST_PENDING
    │         │
    │    RETEST_RUNNING
    │         │
    │    MITIGATED ──► VERIFIED_CLOSED
    │         ▲
    │         └─────── REOPENED  (regression, asset change, new exploit technique)
    │
    └──► VALIDATION_FAILED   (test did not complete — exploitability = NOT_VALIDATED)

Any open state ──► EXPIRED   (authorization window lapsed before completion)
```

### Transition rules

| Transition | Guard condition |
|-----------|----------------|
| → `VALIDATION_RUNNING` | Authorization, scope, verified target identity and required approvals all present (Phase 2) |
| → `CONFIRMED_EXPOSURE` | Evidence meeting the claim's evidence threshold (Phase 4) |
| → `VALIDATION_FAILED` | Test did not complete. **Exploitability stays `NOT_VALIDATED`.** |
| → `MITIGATED` | Remediation applied **and** retest shows the original proof no longer succeeds |
| → `VERIFIED_CLOSED` | Mitigated + asset re-discovered + exposure re-assessed + evidence recorded (Phase 5) |
| → `REOPENED` | Any of: regression in retest, asset rebuilt, new exploit path, version rollback |
| → `CONTROLLED` | Documented compensating control with an owner, review date and its own validation |

**No person or automated agent changes state directly.** Transitions go through the
workflow with their guard conditions checked and the evidence attached. "I closed it
because the ticket said patched" is precisely the failure this model exists to prevent.

## 4. Failure Is Not a Finding

Typed failures keep "the test broke" from silently becoming "the asset is safe."

| Failure | Meaning | Exploitability result |
|---------|---------|----------------------|
| `AUTHORIZATION_FAILURE` | No valid authorization for this target/test | `NOT_VALIDATED` |
| `SCOPE_FAILURE` | Target outside approved scope | `NOT_VALIDATED` |
| `TARGET_AMBIGUOUS` | Could not confirm the target is the intended asset | `NOT_VALIDATED` |
| `PRECONDITION_FAILURE` | Service unreachable, wrong version at test time | `NOT_VALIDATED` (re-assess exposure) |
| `EXECUTION_FAILURE` / `TIMEOUT` | Test did not run to completion | `NOT_VALIDATED` |
| `TELEMETRY_UNAVAILABLE` | Could not observe the outcome | `UNKNOWN` |
| `EVIDENCE_INSUFFICIENT` | Ran, but the result does not meet minimum proof | `UNKNOWN` |
| `CLEANUP_FAILURE` | Test artefacts left behind | Escalate; case cannot close until cleaned |

`NOT_EXPLOITABLE` is a positive claim that needs its own proof: the test completed
fully, the preconditions held, and the expected success marker did not appear.

## 5. Explainability Contract

Every case must be able to answer, in plain language and with evidence links:

1. Why is this exposed?
2. Why does it matter to the business?
3. What proves exploitability (or what proved it is not exploitable)?
4. Which business asset is affected?
5. Which control failed — or held?
6. What remediation happened?
7. What proves the risk is now reduced?

If any answer is "we assume", the case is not ready to report upward.

## ATT&CK Mapping
Validated behaviour on each case maps to the techniques actually demonstrated —
typically T1190 Exploit Public-Facing Application, T1133 External Remote Services,
T1210 Exploitation of Remote Services, T1068 Exploitation for Privilege Escalation —
recorded only for what was proven, never for what was merely theoretically possible.
