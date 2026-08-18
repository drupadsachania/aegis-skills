# Intel → Detection Engineering — Reference

Use during Phase 5 to convert a pattern and its coverage gap into a detection that
actually holds in production. Most intel dies here: the report is read, nobody writes the
rule, and the same technique lands again next quarter.

## 1. Detection Altitude — pick the durable layer

Rank candidate signals by how expensive they are for an adversary to change. Build at the
highest altitude the telemetry supports.

| Altitude | Signal | Adversary Cost to Evade | Durability |
|----------|--------|------------------------|-----------|
| 1 (worst) | File hash, IP, domain | Trivial — rebuild/rotate | Days |
| 2 | Tool artefact (named binary, default UA) | Low — rename, recompile | Weeks |
| 3 | Command-line / parameter pattern | Moderate — obfuscate | Months |
| 4 | **Behavioural relationship between fields** | High — requires new tradecraft | Years |
| 5 (best) | **Required-by-technique invariant** | Very high — technique must change | Durable |

**The invariant is the prize.** For AD CS abuse (T1649), the invariant is
`requester_identity ≠ certificate_subject` — the attack does not work without that
mismatch. Hashes and tool names are disposable; the mismatch is structural.

## 2. From Pattern to Rule

```
For the extracted pattern, ask in order:
  1. What MUST be true for this technique to work?        → the invariant
  2. What telemetry records that invariant?               → the data source
  3. Is that telemetry on, shipped, parsed, retained?     → the data gap check
  4. What legitimate activity also produces it?           → the FP population
  5. What context separates malicious from legitimate?    → the discriminator
  6. What does the analyst do when it fires?              → the response
A detection without step 6 is an alert, not a detection.
```

## 3. Detection Record Template

```yaml
name: Certificate issued with requester/subject mismatch
technique: T1649
pattern: Certificate-based persistence via AD CS misconfiguration (ESC1)
altitude: 5 (technique invariant)

data_source:
  channel: Security (CA servers)
  events: [4886, 4887]
  prerequisite: "certutil -setreg CA\\AuditFilter 127 + audit policy — OFF BY DEFAULT"
  retention_required: 400d   # certs are valid for years; dwell exceeds 90d retention

logic: |
  event_id in (4886, 4887)
  AND requester_account != certificate_subject_or_SAN

false_positives:
  - Enrollment agents legitimately requesting on behalf of others (allowlist by account)
  - Auto-enrollment service accounts (baseline and exclude explicitly)

discriminator: subject names a privileged principal AND requester is not an approved agent

validation:
  method: purple-team emulation (Certipy in a lab), not inventory
  last_tested: null        # untested = partial coverage, not covered

response:
  - Identify the certificate (serial, thumbprint, template)
  - REVOKE the certificate and publish CRL — password reset will NOT work
  - Hunt 4768 PreAuthType=16 for use of that thumbprint
  - Fix the template flag (CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT)

coverage_area: identity-access-management
```

## 4. Detection-in-Depth per Chain

One rule per incident is fragile. Place detections at multiple chain stages so evasion of
one still trips another.

| Chain Stage | Example Detection | If Evaded |
|------------|-------------------|-----------|
| Recon | LDAP reads of certificate-template objects | Next stage catches it |
| Issuance | 4886/4887 requester≠subject | Golden cert bypasses (no CA event) |
| Use | 4768 PreAuthType 16, baseline violation | Hardest to evade — technique requires it |
| Impact | Privileged logon from anomalous host | Last resort |

**Assume the primary rule will be evaded.** Ask which detection still fires, and if the
answer is "none," the coverage is thinner than the matrix claims.

## 5. Validation Before Claiming Coverage

```
A detection is COVERED only when:
  [ ] It fired on a known-true positive (emulation or historical replay)
  [ ] Its FP rate is measured over ≥ 2 weeks of production data
  [ ] The response procedure was walked at least once
  [ ] Data-source health is monitored (alert if the feed goes silent)

Until then it is PARTIAL. Inventory-based coverage claims are how programmes discover
during an incident that the rule never worked.
```

Add a **detection heartbeat**: alert when a critical data source stops producing events.
Silent failure of a log pipeline is indistinguishable from "no attacks" on a dashboard.

## 6. Detection Backlog Prioritisation

| Rank | Build This First | Why |
|------|-----------------|-----|
| 1 | Enable missing telemetry for a Blind area | Unblocks a whole family of rules |
| 2 | Invariant-level rule for a commoditized technique | High volume incoming, durable rule |
| 3 | Behavioural rule at the earliest breakable chain step | Prevents everything downstream |
| 4 | Baseline-violation rule for identity anomalies | Catches the "looks legitimate" class |
| 5 | IOC feeds (hashes/IPs/domains) | Cheap, but expires fast — never the foundation |

## ATT&CK Coverage
T1649 T1550 T1550.004 T1078 T1190 T1195 T1021 T1059 T1552 T1557 T1567 T1041 T1486
T1562 T1070 T1036 T1027 T1071 T1074 T1560 T1119 T1213 T1530 T1537
