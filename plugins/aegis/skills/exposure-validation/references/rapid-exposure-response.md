# Rapid Exposure Response — Reference

Use during Phase 6 when a new CVE or KEV entry lands and the question is urgent: *are we
exposed, and can it be exploited here, right now?* The ordinary lifecycle still applies —
authorization, evidence, verification — but it is pre-arranged so the answer takes
minutes rather than days.

## 1. The Fast Path

```
New CVE / KEV entry
      ↓
Threat intelligence normalised (CVSS, EPSS, KEV, exploit availability, observed use)
      ↓
Affected-asset correlation (which assets run the affected version?)
      ↓
Exposure assessment (are any of them reachable?)
      ↓
Risk calculation (criticality × exposure × threat signal)
      ↓
Pre-approved validation profile selected for this vulnerability class
      ↓
Authorized, scoped validation (Phase 2 gate still applies — pre-arranged, not skipped)
      ↓
Result → remediation → verification
```

The gate is not bypassed; it is *prepared in advance* so it clears in seconds.

## 2. What Makes It Fast Is Preparation, Not Shortcuts

| Prepared ahead | So that, under pressure |
|---------------|------------------------|
| Standing authorization for common asset classes | No scramble for sign-off on routine exposure checks |
| Pre-approved validation profiles per vulnerability class | No improvising a test during an incident |
| Live asset inventory with version data | Correlation is a query, not a project |
| Reachability data from attack-surface mapping | Exposure assessed immediately |
| Crown-jewel map maintained in `risk-management` | Impact framed the moment exposure is confirmed |
| Pre-wired remediation routes (ITSM, CI/CD) | The fix enters change flow without hand-assembly |

A programme that has to assemble authorization, scope and a test method *after* a KEV
drops has already lost the window.

## 3. Threat-Signal Normalisation

Each incoming signal is recorded with its source and timestamp — never treated as fact
without attribution:

| Signal | Source | Use |
|--------|--------|-----|
| CVSS | NVD | Baseline severity of the vulnerability in isolation |
| EPSS | FIRST | Probability of exploitation in the wild (next 30 days) |
| KEV | CISA | Known exploited — the strongest "act now" signal |
| Exploit availability | Vendor advisories, public trackers | Is tooling public? (commoditisation signal) |
| Observed exploitation | Threat intel feeds | Is it being used against others now? |

**KEV presence overrides CVSS for prioritisation.** A CVSS 7.5 in KEV outranks a CVSS
9.8 that no one is exploiting — known exploitation is evidence; a high base score is a
possibility. `threat-intel-synthesis` maintains provenance for every signal; this phase
consumes it.

## 4. Triage Decision

```
Is the affected product in the environment at all?
├── No  → NOT_APPLICABLE (record the determination + evidence; done)
└── Yes
     Are any affected assets reachable from a relevant position?
     ├── No  → NO_EXPOSURE (segmentation/config evidence; monitor for change)
     └── Yes
          Is the asset a crown jewel OR the CVE in KEV OR exploit public?
          ├── Yes → VALIDATION_REQUIRED, expedited — run the pre-approved profile now
          └── No  → VALIDATION_REQUIRED, standard queue
```

## 5. Pre-Approved Validation Profiles

A profile is a vulnerability *class* with its authorization, approval level, depth tier
and expected evidence decided in advance and reviewed before any incident — so that when
a matching CVE appears, the only decisions left are "does it apply here" and "is it in
scope," both answerable from live data.

| Class | Typical depth | Standing approval |
|-------|--------------|-------------------|
| Internet-facing service version exposure | Passive / low-impact reachability + version confirmation | Standing, for in-scope external assets |
| Authentication / access control weakness | Low-impact check against a designated test resource | Named approver per campaign |
| Remote code execution on exposed service | Controlled-execution tier | Senior approver + change window |

Profiles are never invented at response time. If no profile fits, the case joins the
standard lifecycle with a normal planning and approval cycle — slower, but still
inside the rules.

## 6. Commoditisation as an Accelerator

When exploit tooling for a class becomes public, expect volume: the skill floor drops
and opportunistic use rises. That is a signal to expedite exposure assessment across
*all* assets of that class, not just the one the CVE named — the same mechanism will be
pointed at every reachable instance. `threat-intel-synthesis` surfaces commoditisation;
this phase turns it into a scoped sweep.

## 7. Output

```
cve:                CVE-YYYY-NNNNN
kev:                yes/no          epss: 0.NN
affected_assets:    N correlated from inventory
reachable_assets:   M (exposure assessed)
validation:         profile applied | queued | not applicable
exploitability:     CONFIRMED | NOT_VALIDATED | UNKNOWN (per asset)
crown_jewel_impact: any reachable? (from attack-path analysis)
remediation:        routed to <change process>
time_to_answer:     discovery → exposure determination
```

The metric that matters here is time-to-answer: how fast the programme can move from
"a new CVE exists" to "here is our evidenced exposure, and here is what we are doing."

## ATT&CK Mapping
Rapid response most often concerns T1190 Exploit Public-Facing Application and
T1133 External Remote Services — the techniques behind the majority of KEV entries for
internet-facing assets — recorded per case only once proven.
