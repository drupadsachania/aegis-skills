# Threat Intelligence — Reference

**Entry Criteria:** Daily intelligence cycle; new threat actor campaign reported; pre-hunt hypothesis generation; post-incident enrichment.

**Required Inputs:** Threat intel platform (MISP, ThreatConnect, or equivalent), ISAC membership, open-source feeds.

## Intelligence Cycle

```
1. Direction    — What questions does the SOC need answered?
2. Collection   — Gather raw data from all sources
3. Processing   — Normalise into structured format (STIX 2.1)
4. Analysis     — Assess relevance, confidence, and applicability
5. Dissemination — Share finished intel to consumers (SOC, IR, risk)
6. Feedback     — Consumers confirm usefulness; adjust direction
```

## Collection Sources Table

| Source | Type | Reliability Rating | Format |
|--------|------|--------------------|--------|
| FS-ISAC / H-ISAC (sector ISAC) | Sector-specific | High (vetted peers) | STIX, PDF, email |
| CISA Advisories | Government | High | PDF, STIX, YARA |
| MITRE ATT&CK STIX feed | Framework | High | STIX 2.1 |
| VirusTotal Intelligence | Commercial | Medium-High | JSON API |
| AlienVault OTX | Open source | Medium | STIX, CSV |
| Twitter / X threat intel community | Social | Low-Medium (verify before use) | Unstructured |
| Vendor threat intel reports (CrowdStrike, Mandiant) | Commercial | High | PDF, structured |
| Dark web monitoring service | Commercial | Medium | Alerts |

## IOC Confidence Scoring

| Confidence Level | Criteria | Action |
|-----------------|----------|--------|
| High (3) | Confirmed by ≥ 2 independent sources; directly observed in attack against org or close peer | Block immediately; alert on all activity |
| Medium (2) | Single trusted source; corroborated by behavioural indicators | Alert on activity; investigate within 24h |
| Low (1) | Single unverified source; no direct relevance | Watch list; do not block; review weekly |

## Intelligence Outputs

- **Threat intelligence bulletin** — weekly summary for security leadership
- **IOC blocklist** — IP/domain/hash feeds pushed to SIEM and EDR
- **ATT&CK technique coverage update** — new techniques observed → detection gap review
- **Hunt hypothesis** — new actor/campaign triggers proactive hunt (feed to threat-hunting skill)
- **Vulnerability prioritisation input** — CVEs being actively exploited by tracked actors → escalate priority
