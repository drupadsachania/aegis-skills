# Documentation Templates — Deception Engineering Program

Use this reference during Phase 8. A deception program without documentation
is an operational liability. The IR team needs to know what exists, where it lives,
and how to handle a hit. Leadership needs to understand the value. Both require
purpose-built documents.

---

## Document 1 — Deception Asset Registry

The master record of all deployed deception assets. This is a living document.
Every asset must be registered before deployment. Every decommission must be logged.

```
DECEPTION ASSET REGISTRY
Organisation: _______________
Environment: _______________
Registry Owner: _______________
Last Updated: _______________
Classification: CONFIDENTIAL — SECURITY TEAM ONLY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASSET ID:           [e.g. ssh-honey-int-001]
Asset Type:         [Honeypot / Honeytoken / Breadcrumb]
Deception Subtype:  [SSH Honeypot / IAM Key / AD Account / Document / DNS Token / etc.]
Zone:               [from Phase 1 taxonomy]
Placement:          [Exact location — host, path, directory, or AD OU]
Deployed By:        [Name]
Deployed Date:      [Date]
Threat TTP Target:  [MITRE ATT&CK technique IDs this asset intercepts]
Believability Notes:[What makes this look real]
Signal Route:       [Chronicle rule ID / Splunk saved search / CloudWatch rule / Webhook URL]
Alert Destination:  [SIEM queue / PagerDuty / Email / All]
IR Playbook:        [IRP-DECEPTION-001 or equivalent]
Rotation Schedule:  [When does this asset need to be refreshed]
Status:             [Active / Paused / Decommissioned]
Decommission Date:  [If applicable]
Notes:              [Anything IR team needs to know about this specific asset]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Repeat block for each asset]
```

**Registry access policy:**
- Registry must be stored in a read-restricted location (not the general shared drive)
- Access limited to: Security Engineering team, CISO, IR team lead
- Registry must not be shared with clients, vendors, or third parties without CISO approval
- If a red team engagement is planned, the registry is shared with the red team lead only
  under NDA, never with individual red team operators

---

## Document 2 — IR Integration Note

A short, crisp brief for the SOC and IR team so they know exactly how to handle a
deception hit when it fires. This must exist before the first asset goes live.

```
DECEPTION HIT — IR INTEGRATION NOTE
Prepared By: [Security Engineering]
For: [SOC / IR Team]
Classification: CONFIDENTIAL

PURPOSE
This note explains how to handle alerts tagged [DECEPTION_HIT] or originating
from a deception asset. These alerts have a fundamentally different profile than
standard SIEM alerts and must be handled accordingly.

KEY DIFFERENCES FROM STANDARD ALERTS
1. Zero false positives expected. Any deception hit is a confirmed threat indicator.
   Do not dismiss, defer, or close without investigation.

2. Do not suppress. Deception alerts are excluded from all tuning exercises.
   If you are unsure whether a rule should be suppressed, contact [Security Engineering Lead].

3. Deception assets are in the registry. Before investigating, retrieve the asset record
   from the Deception Registry at [location]. The registry tells you what the asset is,
   where it lives, and what attacker behaviour it was designed to intercept.

4. A deception hit is a breach indicator, not a breach confirmation.
   A hit means an attacker has touched a deception asset. It does not mean they have
   reached real data. The hit tells you they are in the environment and moving.
   Treat as an active incident from the moment of alert.

IMMEDIATE ACTIONS ON DECEPTION HIT
Step 1: Do not alert the attacker. Preserve stealth while investigating.
        Do not change passwords, block IPs, or isolate hosts immediately
        unless the attacker appears to be accessing real data.

Step 2: Pull the last 30 days of telemetry from the source host and source account.
        The deception hit tells you they are here now.
        The prior telemetry tells you how long they have been here and how they got in.

Step 3: Identify the patient zero — the initial access vector.
        Work backwards from the deception hit along the attack path.

Step 4: Assess whether any real assets have been accessed.
        The deception hit may be early in the kill chain — prioritise containment
        of real assets before the attacker reaches them.

Step 5: Escalate to [IR Lead] and [CISO] immediately.
        Deception hits are P0 — no hold, no triage queue.

Step 6: Document timeline from initial access to deception hit.
        This is your intelligence output from the deception program.

DECEPTION ASSETS IN THIS ENVIRONMENT
[Summary table — asset type, zone, what a hit means]
| Asset ID            | Type       | Zone          | Hit Means                              |
|---------------------|------------|---------------|----------------------------------------|
| ssh-honey-int-001   | Honeypot   | Internal Net  | Active lateral movement in progress    |
| ad-honey-svc-001    | AD Token   | Identity/AD   | Credential theft and abuse in progress |
| iam-honey-001       | IAM Token  | Cloud         | Cloud credential stolen and in use     |
| doc-honey-ip-001    | Document   | Data Store    | IP document accessed — possible exfil  |

CONTACTS
Security Engineering Lead: [Name / contact]
CISO: [Name / contact]
IR Lead: [Name / contact]
Deception Registry Location: [Path / system]
```

---

## Document 3 — Executive Summary (Leadership / CISO Proposal)

```
DECEPTION ENGINEERING PROGRAM
Executive Summary
Prepared By: [Name], [Title]
Date: [Date]
For: [CISO / Leadership]
Classification: CONFIDENTIAL

THE BUSINESS PROBLEM
[Organisation] operates in an environment where a sufficiently motivated attacker
will eventually gain initial access, regardless of perimeter controls. Industry data
from comparable organisations shows average attacker dwell time — the gap between
initial access and detection — is [X] days. During this window, an attacker with
access to [organisation]'s environment can reach [describe crown jewels: design IP,
OT systems, customer data, supply chain infrastructure].

Our current detection capability is strong at the perimeter and on managed endpoints.
However, we have documented visibility gaps in [list zones], and our existing detection
relies on identifying anomalous behaviour against a legitimate baseline — a method
that sophisticated attackers can defeat by moving slowly and mimicking legitimate patterns.

THE PROPOSED RESPONSE
A deception engineering program places monitored false assets — fake credentials,
fake servers, fake documents — at strategic points inside our environment, calibrated
to the specific attack paths most relevant to our threat profile.

Key properties of this approach:
• Every alert is a confirmed threat indicator. There are no false positives by design.
• Cost-effective: built on existing [TrendMicro/Chronicle] infrastructure.
• Does not disrupt existing operations — assets are passive from the business perspective.
• Detects attackers at the lateral movement phase, before they reach real assets.
• Generates actionable intelligence on attacker tools, techniques, and infrastructure.

SCOPE
Zones covered: [list zones from Phase 1]
Estimated asset count: [number]
Deployment timeline: [X weeks]

INVESTMENT REQUIRED
• Security engineering time: [X days] for design, deployment, and testing
• Additional tooling: [Canarytokens self-hosted / OpenCanary — specify if any cost]
• Ongoing maintenance: [X hours/month]

SUCCESS METRICS
• 100% of deployed deception assets generating confirmed alerts within [X] days of deployment
• Zero false positives in [Y] days of operation
• At least [Z] attacker interactions captured and analysed in first [period]
• Documented reduction in mean-time-to-detect for lateral movement events

RISK IF NOT IMPLEMENTED
Continued detection gap in [zones]. In the event of a breach that originates via
[threat vector], we estimate [X] days of undetected attacker dwell time before
existing controls would surface the activity. During that window, [describe specific risk].

RECOMMENDATION
Approve a [X-week] pilot deployment covering [priority zones]. Results will be
reviewed at the [X]-week mark with CISO to determine programme expansion.
```

---

## Document 4 — Operational Runbook

```
DECEPTION PROGRAM OPERATIONAL RUNBOOK
Version: 1.0
Owner: [Security Engineering Lead]
Review Cycle: Quarterly

1. DAILY OPERATIONS
   - Confirm all deception alert pipelines are active (automated health check)
   - Review previous 24h for any deception hits (should be zero in normal operation)
   - Verify webhook/out-of-band channels are reachable

2. MONTHLY MAINTENANCE
   - Trigger each deception asset from a controlled source and confirm alert fires
   - Confirm alert reaches secondary channel (webhook/email)
   - Review deception registry for assets past rotation schedule
   - Confirm no suppression rules affect deception alerts (audit SIEM exclusion lists)
   - Update registry with any environment changes that affect placement plausibility

3. QUARTERLY REVIEW
   - Reassess attack surface and signal validity (re-run Phase 1 and 2)
   - Review whether new zones warrant deception coverage
   - Rotate honeytoken identifiers (IAM keys, AD account passwords, document tokens)
   - Update detection rules to reflect rotated identifiers
   - Brief CISO on program status and any deception hits from the quarter

4. ASSET ROTATION PROCEDURE
   When rotating a honeytoken or honeypot:
   a. Deploy the new asset and confirm alerting before decommissioning the old one
   b. Update the deception registry (new asset ID, new identifier, new rule reference)
   c. Update SIEM/XDR detection rules to reference new identifier
   d. Decommission old asset — remove from environment
   e. Mark old asset as Decommissioned in registry with date
   f. Verify old identifier no longer triggers alerts

5. DECOMMISSION PROCEDURE
   When removing a deception asset entirely:
   a. Remove the asset from the environment
   b. Archive (do not delete) the detection rule — mark as INACTIVE
   c. Update registry status to Decommissioned with date and reason
   d. Notify IR team of decommission (update IR Integration Note)

6. INCIDENT RESPONSE INTEGRATION
   On receipt of a deception hit:
   a. Refer to IR Integration Note for immediate actions
   b. Do not decommission the triggered asset during active IR — preserve for intelligence
   c. After IR closure, review whether asset design should be updated
   d. Document the incident in the deception registry under the triggered asset
   e. Brief CISO within [X hours] of confirmed deception hit

7. PROGRAMME EXPANSION CRITERIA
   Consider expanding the programme when:
   - Threat intelligence indicates new attack vectors relevant to unprotected zones
   - A deception hit reveals an attack path not currently covered by deception assets
   - Signal validity improves in a zone previously rated too low for deception (Posture F)
   - Organisational changes create new crown jewels or new zones (acquisitions, cloud migration)
```

---

## Naming Conventions

Consistent naming prevents confusion between deception assets and real assets during IR.

**Asset IDs:**
```
<type>-<zone-abbrev>-<sequence>
Examples:
  ssh-honey-int-001        → SSH honeypot, internal network, first deployed
  ad-honey-id-003          → AD honeytoken, identity zone, third deployed
  iam-token-cloud-001      → IAM honeytoken, cloud zone
  doc-token-data-002       → Document honeytoken, data store zone
```

**Detection Rule IDs:**
```
DEC-<asset-id>-<platform>
Examples:
  DEC-ssh-honey-int-001-CHRONICLE
  DEC-ad-honey-id-003-SENTINEL
```

**IR Playbook Reference:**
```
IRP-DECEPTION-<zone-abbrev>
Examples:
  IRP-DECEPTION-INT    → Internal network deception hit playbook
  IRP-DECEPTION-CLOUD  → Cloud deception hit playbook
  IRP-DECEPTION-OT     → OT boundary deception hit playbook (highest severity)
```
