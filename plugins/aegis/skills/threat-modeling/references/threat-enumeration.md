# Threat Enumeration — Reference

Use during Phase 3 to systematically apply STRIDE to each DFD element and populate the threat register.

## STRIDE Application per DFD Element Type

| DFD Element | S — Spoofing | T — Tampering | R — Repudiation | I — Info Disclosure | D — Denial of Service | E — Elevation of Privilege |
|-------------|-------------|--------------|----------------|--------------------|-----------------------|--------------------------|
| External Entity | Attacker impersonates the entity | — | Entity denies sending a request | — | Entity floods with requests | — |
| Process | Attacker tricks process into accepting forged identity | Input manipulation, injection attacks | Process doesn't log actions | Verbose error messages, data leaks | Resource exhaustion, infinite loops | Logic flaw allows privilege gain |
| Data Store | — | Unauthorised write to store | — | Unauthorised read; data at rest unencrypted | Store becomes unavailable | Privilege escalation to DBA role |
| Data Flow | Intercept and impersonate | MITM tampering | — | Sniffing unencrypted traffic | Flood or block the channel | — |
| Trust Boundary | Bypass boundary with forged credentials | Pass malicious data through unchecked | — | Data leaks across boundary | — | Lower-trust process gains higher-trust access |

## Threat Register Template

| ID | DFD Element | STRIDE Category | Threat Statement | Likelihood (1–3) | Impact (1–3) | DREAD Score | Mitigation | Owner | Status |
|----|-------------|----------------|-----------------|-----------------|-------------|-------------|-----------|-------|--------|
| T-001 | Login Process | Spoofing | Attacker brute-forces user credentials at /auth/login | 3 | 3 | 2.6 | Rate limiting + MFA + account lockout | Auth Team | Open |
| T-002 | Order DB | Information Disclosure | SQL injection in order search reveals all customer records | 2 | 3 | 2.4 | Parameterised queries + WAF | API Team | Open |
| T-003 | API Gateway → Payment Service | Tampering | Attacker replays captured JWT to initiate duplicate payment | 2 | 3 | 2.2 | JWT `jti` claim nonce check; short expiry | Platform | Open |

## DREAD Scoring Guide (for this table)

Average of 5 dimensions (1–3 each):
- **D**amage potential: 1=minimal, 2=significant, 3=catastrophic
- **R**eproducibility: 1=difficult, 2=repeatable, 3=trivial
- **E**xploitability: 1=expert attacker, 2=skilled, 3=script kiddie
- **A**ffected users: 1=one user, 2=group, 3=all users
- **D**iscoverability: 1=very difficult, 2=needs access, 3=trivially found

Prioritise all threats with DREAD ≥ 2.5 for immediate mitigation.

## Threat Enumeration Completeness Check

Before closing Phase 3, verify:
- [ ] Every DFD process has at least 2 STRIDE entries
- [ ] Every trust boundary crossing has at least 1 Spoofing + 1 Tampering entry
- [ ] Every data store has at least 1 Information Disclosure entry
- [ ] Every external entity has at least 1 Repudiation entry
- [ ] All ATT&CK technique cross-references populated
