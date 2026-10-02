# Validation Authorization & Scope — Reference

Use during Phase 2. This is a gate, not a step: no validation that touches a live
target proceeds until every condition below is satisfied and recorded. The entire
credibility of an exposure-validation programme rests on being able to show that every
test was authorized, scoped and approved before it ran.

## 1. The Five Preconditions

All five, every time, before any execution:

```
AUTHORIZATION   — a written, current mandate covering this target and this kind of test
      +
SCOPE           — the target is explicitly inside the approved boundary
      +
POLICY          — the test's impact class is permitted for this asset, environment and time
      +
CAPABILITY      — the test is an approved, pre-reviewed capability (never improvised)
      +
APPROVAL        — any approval the policy demands has been granted by a named human
      ↓
   EXECUTE
```

If any one is missing, ambiguous or expired:

| Condition | Decision |
|-----------|----------|
| Authorization cannot be established | **DO NOT EXECUTE** |
| Target identity cannot be verified | **DO NOT EXECUTE** |
| Scope is ambiguous | **DO NOT EXECUTE** |
| Approval required but not granted | **DO NOT EXECUTE** — case moves to `VALIDATION_PENDING` / `BLOCKED` |
| Authorization window expired mid-campaign | **STOP** — case moves to `EXPIRED` |

Ambiguity resolves toward not executing. "It's probably ours" is not authorization.

## 2. Authorization

| Element | Requirement |
|---------|------------|
| Mandate | Signed rules of engagement or standing authorization, naming the authorizing owner |
| Ownership | The organisation owns or has written permission for every target — third-party SaaS, cloud provider infrastructure and shared hosting need the provider's terms checked |
| Coverage | The mandate names the test types allowed (passive, low impact, controlled execution, impact validation) |
| Validity | Start and end dates; maintenance and blackout windows |
| Contacts | Emergency stop contact and escalation path, reachable during the window |

**Cloud and SaaS caution:** owning an account does not authorize testing the provider's
shared infrastructure. Check the provider's penetration-testing policy and stay on
resources you control.

## 3. Scope

```
Scope definition, most to least preferred:
  1. Explicit asset identities (verified hostnames, instance IDs, resource ARNs)
  2. Explicit CIDR ranges, with confirmed ownership
  3. Tagged asset groups resolved to explicit identities at test time

Never:
  • "the 10.0.0.0/8 network" without ownership confirmation per range
  • scope inferred from a scanner's discovery output
  • scope that expands automatically when new assets are discovered
```

**Scope never expands implicitly.** A validation that discovers a new reachable host
records the discovery as a finding — it does not test it. Expanding scope is a new
authorization decision made by a human.

## 4. Target Identity Verification

Between scope approval and execution, the asset at the address can change — DHCP
reassignment, autoscaling, failover, DNS changes, or deliberate spoofing.

| Check | Purpose |
|-------|---------|
| Resolve identity at execution time, not planning time | Catch reassignment since approval |
| Match against inventory (instance ID, certificate fingerprint, MAC, host key) | Confirm it is the approved asset |
| Confirm environment tag (prod / staging / lab) matches the plan | Avoid testing prod under a staging approval |
| Reject on any mismatch | Spoofing and drift both look like "close enough" |

## 5. Policy Decisions

The policy evaluator returns one decision per (operator, test, target, time):

| Decision | Meaning |
|---------|---------|
| `ALLOW` | Execute within the stated limits |
| `DENY` | Do not execute; record why |
| `REQUIRE_APPROVAL` | A named approver must sign off first |
| `REQUIRE_CHANGE_WINDOW` | Only inside an approved maintenance window |
| `REQUIRE_TARGET_CONFIRMATION` | Re-verify identity immediately before execution |
| `REQUIRE_MFA` | Operator must re-authenticate |

Inputs the policy must consider: environment, asset classification, business
criticality, test impact class, time window, operator, authorization validity and
whether the asset is safety-critical (OT/medical — see `operational-technology`).

**The policy is enforced where execution happens, not only where plans are made.**
A plan that was approved yesterday is re-checked at execution time today.

## 6. Approval Ladder by Impact

| Test depth | Typical approval |
|-----------|-----------------|
| `PASSIVE` | Standing authorization; no per-test approval |
| `LOW_IMPACT` | Standing authorization + asset owner notified |
| `CONTROLLED_EXECUTION` | Named approver per campaign; change window for production |
| `IMPACT_VALIDATION` | Senior security approver **and** business owner; change window; rollback plan reviewed |

Production crown jewels and safety-critical systems should default one rung higher.

## 7. Safety Controls That Must Exist

```
[ ] Target allowlist (identity- and CIDR-based)       [ ] Kill switch, tested
[ ] Rate and concurrency limits                       [ ] Execution timeouts
[ ] Network egress restricted to approved targets     [ ] Mandatory cleanup with verification
[ ] Credentials scoped to the test and short-lived    [ ] Secrets redacted from logs and reports
[ ] Isolation between organisations/environments      [ ] Tamper-evident audit log
```

**Credentials never travel in plans, prompts, tickets or reports.** Tests reference a
credential by identifier; the execution environment retrieves a short-lived, scoped
credential at run time. Any planner or analyst sees "credential available: yes", never
the secret itself.

## 8. Audit Record for Every Execution

who · what · when · where · why · authorization reference · policy decision · approver ·
target identity (as verified) · capability · result · evidence references ·
cleanup status · state transition triggered.

The audit log must be append-only and tamper-evident. A validation programme that
cannot prove its own conduct becomes a liability during the very incident it was meant
to prevent.

## ATT&CK Mapping
This phase is governance rather than technique-bearing; it constrains which techniques
later phases may emulate.
