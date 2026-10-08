# Incident Reconstruction — "Map Out What Happened" — Reference

Use during Phase 3 to rebuild an incident end-to-end from fragmentary public reporting.
The goal is a defensible narrative: what happened, in what order, with what evidence, and
where the reporting is silent.

## 1. Reconstruction Method

```
1. Anchor the timeline    — fix every dated fact to a timeline first
2. Place the entry point  — how did they get in? (if unknown, say so explicitly)
3. Walk the chain forward — each step must be evidenced or explicitly marked inferred
4. Identify the pivot     — the moment containment became hard (see §4)
5. Locate the detection   — how were they found, and how late?
6. Mark the silences      — what the reporting does NOT say is analytically important
```

**Never smooth over a gap.** A reconstruction that reads as a seamless story is usually
part fiction. Mark every inference.

## 2. Timeline Template

| Time | Event | Evidence | Confidence | Source |
|------|-------|----------|-----------|--------|
| T-90d | Initial access via edge device | Vendor IR report | High | Microsoft, 2026-08-11 |
| T-89d | Credential harvesting | Inferred from later access | **Moderate — inferred** | — |
| T-14d | Lateral movement to file server | Log excerpt in report | High | Vendor |
| T-0 | Ransomware deployed | Public confirmation | High | Victim statement |
| T+3d | Detection & disclosure | Press release | High | Victim |

**Dwell time** (entry → detection) is the single most instructive metric to extract. It
tells you which control layer failed, not merely that one did.

## 3. Diamond Model Framing

For each incident, populate all four vertices — gaps are as informative as content:

```
        Adversary  (who — with confidence; often unknown)
            │
Infrastructure ─── Capability   (C2, tooling, malware, exploit)
            │
         Victim    (sector, geography, why them — target of choice or of opportunity?)

Key question: was this victim SELECTED or merely REACHABLE?
Target-of-opportunity incidents (mass exploitation of an edge CVE) demand different
defence than target-of-choice (a determined actor after your specific data).
```

## 4. Finding the Pivot Point

Every serious incident has a moment where the adversary's position became durable and
your standard response stopped working. Name it explicitly.

| Pivot Type | What Changed | Why Containment Broke |
|-----------|--------------|----------------------|
| Credential → certificate | Persistence no longer password-based | Password resets are inert; only revocation kills it (T1649) |
| User → domain admin | Blast radius became total | Per-host containment insufficient |
| Endpoint → identity provider | Trust anchor itself compromised | Token/session theft bypasses MFA (T1550.004) |
| IT → OT crossing | Impact became physical/safety | Standard IR may create a safety hazard |
| Single tenant → supply chain | One victim became many | Containment now needs downstream notification |

The pivot is where your containment model's assumptions were violated. That is the most
transferable lesson in the entire reconstruction.

## 5. Reading the Silences

What reporting omits, and what each omission usually means:

| Silence | Usual Meaning | How to Treat |
|---------|--------------|--------------|
| Initial access unstated | Genuinely unknown, or legally sensitive | Do NOT assume phishing by default |
| Dwell time unstated | Often embarrassingly long | Note as unknown; do not estimate |
| "Sophisticated actor" with no TTPs | Frequently a routine technique | Discount the adjective; wait for detail |
| No mention of MFA | May have been absent or bypassed | Distinguish these — very different lessons |
| Victim count "approximately" | Still being scoped | Keep the number soft |

## 6. Counterfactual Analysis — the part that changes decisions

For each step, ask which control would have broken the chain. This converts a story into
a control priority list.

| Chain Step | Control That Breaks It | Do We Have It? | Layer |
|-----------|----------------------|----------------|-------|
| Edge device exploited (T1190) | KEV-driven emergency patching SLA | Partial | Attack surface mgmt |
| DNS hijack (T1557) | DNSSEC validation + resolver pinning | No | Network |
| Token theft (T1550.004) | Token binding / conditional access | Partial | Identity |
| Lateral movement (T1021) | Segmentation + PAM jump host | Yes | Network |
| Exfiltration (T1567) | Egress DLP + volume anomaly | Partial | Data |

**Earliest breakable link wins.** Prioritise the control furthest left in the chain that
you can realistically deploy — it prevents everything downstream.

## 7. Reconstruction Output

```
## What happened (plain language, 3-5 sentences, no jargon)
## Timeline (table, with confidence per row)
## The chain (ATT&CK IDs, in order)
## The pivot (the moment containment assumptions broke)
## What the reporting does not say (explicit silences)
## Counterfactuals (which control breaks which link — ranked)
## What this changes for us (detections, controls, or "already covered")
```

Write the plain-language section so a non-specialist understands it. If you cannot
explain the incident without jargon, you have not finished understanding it.

## ATT&CK Coverage
T1190 T1133 T1566 T1078 T1021 T1550 T1550.004 T1557 T1649 T1556 T1486 T1490 T1567
T1041 T1074 T1560 T1485 T1584 T1195 · ICS: T0855 T0858 T0880 · ATLAS: AML.T0018
