# Signal Source Validity Assessment

Use this reference during Phase 2. The validity of your existing signal sources
directly determines the deception posture you apply in Phase 3.

---

## Why Signal Validity Changes the Deception Decision

Deception engineering is not a replacement for your detection stack — it is a
precision complement to it. The weaker your existing signal validity in a zone,
the harder your deception assets must work: they must be denser, more self-contained,
and must generate signals that do not require the existing stack to correlate.

Conversely, where your signal validity is high, deception becomes a tripwire backstop —
sparse, calibrated, and integrating cleanly into a stack that already processes signal well.

---

## Assessment Dimensions

### 1. Coverage
What percentage of assets in this zone generate logs that reach your SIEM or XDR?

| Rating | Definition |
|--------|------------|
| Full (90-100%) | Every asset type is instrumented. Agent-based or API-native collection. |
| Partial (50-89%) | Most assets covered, known gaps (legacy systems, unmanaged devices). |
| Sparse (10-49%) | Significant blind spots. Majority of zone is uninstrumented. |
| Blind (<10%) | Effectively no visibility. Logs exist but do not reach SIEM. |

**Deception implication:** Sparse/Blind zones need high-density honeytoken placement to
compensate. In a blind zone, a deception hit may be the *only* signal you get.

---

### 2. Fidelity
What is the baseline noise level from this source?

| Rating | Definition |
|--------|------------|
| High Fidelity | < 5% false positive rate. Alerts are actioned, not tuned away. |
| Medium Fidelity | 5-30% FP rate. Requires correlation with other sources. |
| Low Fidelity | > 30% FP rate. Alert fatigue is active. Analysts skip without correlation. |

**Deception implication:** In a low fidelity zone, your deception signals must be routed
separately from standard alerts — tagged distinctly so analysts do not suppress them
during tuning exercises. A deception hit must never share a suppression rule with
a noisy legitimate event. Document this explicitly in the IR integration note (Phase 8).

---

### 3. Latency
How quickly does an event in this zone produce an actionable alert?

| Rating | Definition |
|--------|------------|
| Real-time | Alert within 60 seconds of event. Streaming ingest. |
| Near-real-time | Alert within 1-5 minutes. API polling or frequent batch. |
| Delayed | Alert within 1-24 hours. Batch ingest, scheduled jobs. |
| Forensic-only | Logs exist but are only reviewed post-incident. No alerting. |

**Deception implication:** In delayed or forensic-only zones, design deception assets
that generate out-of-band signals independently of the SIEM — webhooks, email callbacks,
DNS callbacks (Canarytokens pattern). Do not rely on the SIEM to alert in time if latency
is hours or days.

---

### 4. Integration Maturity
How well does this source feed your SIEM/XDR pipeline?

| Rating | Definition |
|--------|------------|
| Enriched | Logs are parsed, normalised, entity-enriched, and correlated. |
| Correlated | Parsed and normalised. Some correlation rules exist. |
| Parsed | Log fields are extracted but minimal correlation. |
| Raw | Logs arrive as raw text/syslog. No parsing. Analyst must manually read. |

**Deception implication:** In raw/parsed zones, deception rules cannot rely on field-level
matching in the SIEM. Use simple string/regex rules, or route deception signals via a
webhook to a dedicated channel (Slack, PagerDuty, email) that bypasses SIEM parsing complexity.

---

### 5. Documented Blind Spots
Every environment has blind spots the team is aware of. Surface them explicitly.

Common blind spots by source type:

**EDR (e.g. TrendMicro, CrowdStrike):**
- Unmanaged endpoints (BYOD, IoT, OT workstations without agents)
- Containers and serverless functions
- Network-level lateral movement (EDR sees process on endpoint, not SMB traffic between endpoints)
- Encrypted C2 over legitimate cloud services (Teams, Slack, Google Drive)

**SIEM / Chronicle:**
- Sources not onboarded (coverage gap)
- Parsers failing silently (logs arrive but fields not extracted correctly)
- Timestamp normalisation issues (events out of order, correlation misses)
- Cloud-native services with API-only logging not yet integrated

**NDR / Network:**
- Encrypted east-west traffic (post-TLS inspection gap)
- OT protocols (Modbus, DNP3, OPC not parsed by most NDR)
- Cloud-native traffic (bypasses on-prem NDR entirely)

**IAM / Identity:**
- Service account activity not reviewed (alert fatigue from volume)
- Federated identity (SAML/SSO logs may be in IdP, not SIEM)
- Legacy NTLM authentication (often excluded from modern logging configs)

---

## Signal Validity Scorecard Template

Complete this for each signal source in scope before Phase 3.

```
Source Name:        [e.g. TrendMicro Apex One / Chronicle / Zeek NDR]
Zone(s) Covered:    [e.g. Endpoint, Internal Network]
Coverage Rating:    [Full / Partial / Sparse / Blind]
Fidelity Rating:    [High / Medium / Low]
Latency Rating:     [Real-time / Near-real-time / Delayed / Forensic-only]
Integration:        [Enriched / Correlated / Parsed / Raw]
Documented Gaps:    [List explicitly]
Overall Validity:   [High / Medium / Low — aggregate judgement]
```

---

## Platform-Specific Notes

### TrendMicro Vision One / Apex One
- Coverage: Excellent on managed Windows/macOS endpoints. Gaps on Linux servers
  unless sensor deployed. Zero coverage on network-only devices.
- Integration: Vision One has native XDR correlation. Apex One standalone is parsed-level only.
- Blind spots: Encrypted traffic, unmanaged endpoints, containerised workloads.
- Deception routing: Vision One supports custom alert sources via the Workbench API —
  route deception hits here with `risk_level: high` and custom `tags: ["DECEPTION_HIT"]`.

### Google Chronicle
- Coverage: Source-dependent. As a SIEM, Chronicle is only as complete as what is onboarded.
- Integration: YARA-L rules operate on parsed fields — confirm parser health for every source
  before writing deception rules against field values.
- Latency: Near-real-time for streaming sources. Delayed for batch ingest.
- Deception routing: Write dedicated YARA-L rules per deception asset. Use `outcome`
  variable to set `risk_score: 95` and `$verdict: "deception_hit"`. Route via detection
  alert → SOAR playbook, not standard analyst queue.
- Blind spots: Any source not yet onboarded. Chronicle tells you nothing about what it
  cannot see — audit your forwarder list against your asset inventory.

### Splunk
- Deception routing: Use `index=deception` as a dedicated index. Write SPL with
  `| where deception_asset_id != ""` as the base filter. Route via Notable Events in ES
  with `urgency=critical` and `status=new` — do not let deception hits go to review queue.

### Microsoft Sentinel
- Deception routing: Use Analytics Rules with `Tactics: ["InitialAccess", "LateralMovement"]`
  and `Severity: High`. Tag incidents with `DeceptionHit: true` custom entity for
  SOAR playbook routing.

### Elastic SIEM (ECS)
- Deception routing: Use Detection Engine rules with `risk_score: 99` and custom
  `tags: ["deception", "confirmed_threat"]`. Route via Elastic Actions to PagerDuty or webhook.

---

## Out-of-Band Signalling (When SIEM Cannot Be Trusted for Latency)

When signal validity is low and you cannot rely on SIEM latency, use these patterns:

**DNS Callback (Canarytokens pattern):**
Every honeytoken embeds a unique subdomain. When triggered, the victim system
makes a DNS lookup to `<token-id>.canarytokens.com` (or your self-hosted Canarytokens).
Fires independently of any SIEM. No parsing required. Latency = seconds.

**HTTP/HTTPS Callback:**
Documents, links, and images embed a unique URL. On open, a GET request fires to your
monitoring endpoint. Works cross-network, cross-device, cross-environment.

**AWS CloudTrail Direct Alert:**
IAM honeytoken usage fires directly in CloudTrail → CloudWatch Events → SNS → PagerDuty.
Does not route through SIEM at all. Latency = seconds. Zero parsing dependency.

**Self-Hosted Canarytokens (Thinkst):**
Run your own Canarytokens server inside your environment for tokens that must not
touch external infrastructure (compliance-constrained environments, OT-adjacent zones).
