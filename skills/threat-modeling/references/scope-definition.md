# Scope Definition — Reference

Use during Phase 1 to establish the threat model scope before constructing data flow diagrams.

## Scope Checklist

| Scope Item | Questions to Answer | Example |
|------------|--------------------|---------
| System name | What are we modelling? | Payment processing microservice |
| System boundary | What is IN scope vs OUT of scope? | IN: API, auth service, DB. OUT: CDN, user browser |
| Entry points | How does data / users enter the system? | REST API (HTTPS 443), batch file upload (SFTP) |
| Exit points | Where does data leave the system? | REST API responses, webhook callbacks, audit log export |
| Data assets | What data does the system process or store? | PAN (Primary Account Number), PII, session tokens |
| Trust boundaries | Where does trust level change? | Internet → DMZ, DMZ → internal, service → database |
| Out-of-scope components | What are we explicitly NOT modelling? | Physical security, end-user device |
| Regulatory scope | Which compliance frameworks apply? | PCI DSS (for payment data), GDPR (for EU PII) |

## Adversary Profiles Table

| Profile | Motivation | Capabilities | Likely Entry Points |
|---------|-----------|-------------|---------------------|
| External attacker | Financial gain, espionage | Moderate-high; uses known exploits + social engineering | Internet-facing APIs, phishing, supply chain |
| Insider threat (malicious) | Financial gain, sabotage, ideology | High — legitimate access, knows system internals | Privileged access misuse, data exfiltration |
| Insider threat (negligent) | Mistake / social engineering victim | Low — unintentional | Phishing, misconfiguration, lost devices |
| Supply chain / third-party | Range of motives | Moderate — compromised vendor tools or code | Software updates, CI/CD pipeline, managed service access |
| Automated attacker (bots) | Credential stuffing, scraping | Low-moderate — uses automated toolkits | Authentication endpoints, public APIs |
| Nation-state APT | Espionage, disruption | Very high — zero-days, custom tooling | All vectors; patient, persistent |

## Assets Register Format

| Asset ID | Asset Name | Asset Type | Data Classification | Business Impact if Compromised |
|----------|-----------|-----------|--------------------|---------------------------------|
| A-001 | Customer PAN | Data | Restricted (PCI) | High — regulatory fine, brand damage |
| A-002 | Session tokens | Data | Confidential | High — account takeover |
| A-003 | Payment API | System | — | Critical — revenue impact |
| A-004 | Encryption keys | Credential | Restricted | Critical — all PAN exposed |

## Scope Sign-off

Before proceeding to DFD construction, obtain sign-off confirming:
- [ ] System boundary agreed with system owner
- [ ] All entry/exit points identified
- [ ] Adversary profiles selected and prioritised
- [ ] Assets register complete and classified
- [ ] Compliance frameworks identified
