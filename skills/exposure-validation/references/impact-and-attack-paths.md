# Impact & Attack Paths — Reference

Use during Phase 3 to answer the question that turns a confirmed exposure into a
business decision: *what does an attacker actually reach from here?* A confirmed
exploit on an isolated asset with no onward path is a very different risk from the same
exploit one hop from a domain controller.

## 1. Impact Is About Reachability, Not Severity

CVSS describes the vulnerability in isolation. Impact describes it in your environment:
what it connects to, what it trusts, and whether any chain of trust leads to something
that matters. Two assets with the identical CVE can have opposite impact because one
sits in a flat network beside the crown jewels and the other is isolated behind
segmentation.

| Impact state | Meaning |
|-------------|---------|
| `CROWN_JEWEL_REACHABLE` | A path of evidenced edges leads from this exposure to a crown-jewel asset |
| `LIMITED` | Reaches other assets, but no evidenced path to crown jewels |
| `CONTAINED` | Segmentation, trust boundaries or controls stop onward movement |
| `UNKNOWN` | The onward graph has not been mapped — do not report as `CONTAINED` by default |

`UNKNOWN` is not `CONTAINED`. Absence of a mapped path is not evidence of absence.

## 2. The Attack Graph

Model the environment as a graph where impact is a reachability question.

| Node type | Examples |
|-----------|----------|
| Principal | User, service account, role, workload identity |
| Asset | Host, VM, container, function, device |
| Credential | Key, token, certificate, password hash |
| Network | Segment, VPC, subnet, trust zone |
| Application / Service | App, API, database, message broker |
| Data | Record store, bucket, secret store |
| Security control | Segmentation device, EDR, IdP, WAF |

Edges carry a relationship, evidence and confidence:

```
REACHES            A can open a network path to B
AUTHENTICATES_TO   principal can authenticate to service
CAN_EXECUTE        principal can run code on asset
CAN_ACCESS         principal can read/write data
TRUSTS             A accepts B's assertions (federation, SSO, cert chain)
DEPENDS_ON         A's function requires B
ROUTES_TO          network path exists through C
PROTECTED_BY       asset sits behind control
```

**Every edge needs evidence and a confidence value.** An unverified edge — "they could
probably pivot here" — is a hypothesis to validate, flagged as such, not a fact in the
path. A crown-jewel path built on three unverified edges is a guess wearing a diagram.

## 3. Relational vs Graph Modelling

A dedicated graph database is not required to start. Attack-path queries can run over a
well-indexed relational edge table for most environments; adopt a graph database only
when path-finding across a large, dense environment becomes the measured bottleneck —
and record that reasoning. Do not add the operational burden of a graph store for
elegance alone.

## 4. Crown Jewels Come From the Business, Not the Scanner

Impact is meaningless without knowing what matters. Map the chain explicitly:

```
Asset ──► Application ──► Business Service ──► Business Capability ──► Criticality
```

Crown jewels are defined with business owners — revenue-critical systems, regulated
data stores, identity infrastructure (the IdP and domain controllers), backup systems,
and safety-critical OT. This mapping belongs in `risk-management`; this phase consumes
it. A technically severe exposure on a system the business considers disposable is a
lower priority than a moderate one on the payment path — and only the business can draw
that line.

## 5. Path Analysis Output

For each confirmed exposure with onward reach:

| Field | Content |
|-------|---------|
| Entry | The confirmed exposure (asset + technique proven) |
| Path | Ordered edges to the nearest crown jewel, each with evidence and confidence |
| Weakest verified link | The lowest-confidence edge — the one most worth confirming |
| Earliest break point | The earliest edge a control could sever (feeds remediation priority) |
| Blast radius | Assets and data reachable if the full path holds |
| Path confidence | The product of edge confidences — one weak edge caps the chain |

**Prioritise breaking the earliest edge you can.** A single segmentation change low in
the path can neutralise many downstream exposures at once — often a better investment
than patching each exposure individually.

## 6. Impact Changes When the Environment Changes

Attack paths are not static. A new trust relationship, a firewall change, a new
credential, or a decommissioned segmentation device can open or close a crown-jewel
path without any new vulnerability. Treat environment changes as triggers to
re-evaluate the paths of existing cases — a `CONTAINED` case can silently become
`CROWN_JEWEL_REACHABLE` the day someone flattens a network for convenience.

## ATT&CK Mapping
Path edges correspond to post-exploitation tactics: T1021 Remote Services,
T1550 Use Alternate Authentication Material, T1078 Valid Accounts, T1548 Abuse
Elevation Control, T1134 Access Token Manipulation, T1484 Domain Policy Modification.
Edges are recorded with the evidence that the relationship exists in the environment,
not merely that the technique is conceivable.
