# Risk Identification

## Purpose
Systematically identify risks using threat-informed asset analysis, threat modelling, vulnerability inputs, and business context mapping.

---

## 1. Threat-Informed Asset Inventory

### Critical Asset Identification
```
Criteria for criticality:
  - Revenue generation (e.g. payment processing, trading systems)
  - Regulatory compliance (e.g. systems processing PII, PHI, PAN)
  - Operational dependency (e.g. manufacturing control, logistics)
  - Reputational impact (e.g. customer-facing systems)
  - Intellectual property (e.g. source code repositories, R&D data)

Asset criticality rating: Critical / High / Medium / Low

For each critical asset, map:
  - Which threat actor groups target this type of asset?
  - What ATT&CK techniques are most relevant?
  - What existing controls mitigate those techniques?
```

### MITRE ATT&CK Groups for Asset-to-Threat Mapping
```
Financial sector assets:
  APT28 (G0007), FIN7 (G0046), Lazarus Group (G0032)
  Relevant techniques: T1566 (phishing), T1078 (valid accounts),
  T1486 (ransomware), T1041 (exfil over C2)

Healthcare assets:
  APT41 (G0096), BRONZE BUTLER (G0060)
  Relevant techniques: T1190 (exploit public), T1003 (credential dump)

OT/ICS assets:
  Sandworm (G0034), XENOTIME
  Relevant techniques: T0800-T0900 range (ICS techniques)
```

---

## 2. Threat Modelling Integration

### STRIDE per Asset Type
| Threat | Description | Example |
|--------|-------------|---------|
| Spoofing | Identity falsification | Credential theft, session hijack |
| Tampering | Data modification | Man-in-the-middle, SQL injection |
| Repudiation | Deny action occurred | Log deletion, audit trail gaps |
| Information Disclosure | Unauthorised data access | Data exfiltration, misconfigured bucket |
| Denial of Service | Service disruption | DDoS, ransomware |
| Elevation of Privilege | Gain unauthorised access | Local privilege escalation, SSRF |

### PASTA (Process for Attack Simulation and Threat Analysis)
```
Stage 1: Define objectives (business impact analysis)
Stage 2: Define technical scope (DFDs, system inventory)
Stage 3: Decompose application (trust boundaries, entry points)
Stage 4: Threat analysis (threat actors, attack patterns)
Stage 5: Vulnerability analysis (scanners, pen test, CVEs)
Stage 6: Attack modelling (attack trees per threat scenario)
Stage 7: Risk analysis (risk scoring, treatment priority)
```

---

## 3. Vulnerability Input Sources

| Source | Cadence | Scope |
|--------|---------|-------|
| Vulnerability scanner (Tenable, Qualys) | Weekly | All in-scope assets |
| Penetration test findings | Annual / Ad hoc | Selected scope |
| Bug bounty reports | Continuous | External attack surface |
| CISA KEV (Known Exploited Vulnerabilities) | Continuous | All CVEs with active exploitation |
| NVD/CVE feed | Continuous | Vendor-specific CVEs |
| Threat intelligence | Continuous | TTPs and IOCs |

### CISA KEV Integration
```
# Monitor CISA KEV catalogue
curl https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json

# For each KEV entry affecting your asset inventory:
# 1. Immediate escalation if asset is in CDE or critical tier
# 2. Emergency patching SLA: 24-48h for active exploitation
# 3. Add to risk register immediately as High/Critical
```

---

## 4. Business Context Mapping

For each identified risk, capture business context:

| Dimension | Questions |
|-----------|----------|
| Revenue impact | Which revenue streams are affected? Estimated $ loss per day of outage? |
| Regulatory exposure | Which regulations are implicated? Potential fine range? |
| Reputational risk | Would this be public? Media coverage potential? Customer impact? |
| Operational dependency | How long before manual processes fail? Vendor dependencies? |
| Legal liability | Data subject notification requirements? Class action exposure? |

---

## 5. Emerging Threat Horizon Scanning

### Sources for Horizon Scanning
```
Zero-day advisories:
  - CISA advisories (https://www.cisa.gov/uscert/ncas/alerts)
  - Vendor security bulletins (Microsoft Patch Tuesday, Adobe, etc.)
  - Project Zero (https://googleprojectzero.blogspot.com/)

Threat actor intelligence:
  - MITRE ATT&CK Groups (https://attack.mitre.org/groups/)
  - Mandiant/CrowdStrike threat reports
  - ISAC advisories (FS-ISAC, H-ISAC, E-ISAC for sector-specific)

Supply chain events:
  - Software supply chain attacks (e.g. SolarWinds-style)
  - Open source package compromises (npm, PyPI)
  - CISA supply chain security alerts

Geopolitical factors:
  - State-sponsored threat actors activated by geopolitical events
  - Critical infrastructure targeting during conflict periods
```

---

## 6. Risk Identification Workshop Facilitation

```
Workshop Format:
  Duration: 2-4 hours
  Participants: Business owners, IT/security, Legal/Compliance
  Facilitator: CISO/GRC lead

Structured approach:
  1. Review asset inventory (15 min)
  2. Review recent threat intelligence (15 min)
  3. Brainstorm risks per asset/process (60 min)
     - "What could go wrong?"
     - "What would cause us to fail our regulatory obligations?"
     - "What do our adversaries want from us?"
  4. Initial risk categorisation (30 min)
  5. Assign owners and prioritise for assessment (30 min)

Output: Raw risk list with initial categorisation for formal assessment
```
