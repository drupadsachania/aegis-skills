# AppSec Threat Modelling — Reference

Use during Phase 1 to enumerate threats against the application using STRIDE applied to the data flow diagram.

## STRIDE per Component Table

| STRIDE Category | Threat Example | OWASP Category | ATT&CK Reference |
|-----------------|---------------|----------------|-----------------|
| **S**poofing | Attacker impersonates legitimate user | A07:2021 Identification & Authentication Failures | T1078 Valid Accounts |
| **T**ampering | Attacker modifies request parameters in transit | A03:2021 Injection | T1565 Data Manipulation |
| **R**epudiation | User denies performing a transaction; no audit log | A09:2021 Logging & Monitoring Failures | T1562 Impair Defenses |
| **I**nformation Disclosure | SQL error reveals database schema | A01:2021 Broken Access Control | T1213 Data from Info Repositories |
| **D**enial of Service | Unauthenticated endpoint hit with high rate | — | T1498 Network DoS |
| **E**levation of Privilege | IDOR allows access to other user's records | A01:2021 Broken Access Control | T1548 Abuse Elevation |

## STRIDE Application by DFD Element

| DFD Element | Most Relevant STRIDE Threats |
|-------------|------------------------------|
| External User / Actor | Spoofing, Repudiation |
| Process (application logic) | Tampering, Denial of Service, Elevation of Privilege |
| Data Store (DB, cache, file system) | Tampering, Information Disclosure |
| Data Flow (API calls, internal service comms) | Tampering, Information Disclosure, Denial of Service |
| Trust Boundary crossing | Spoofing, Tampering, Elevation of Privilege |

## DREAD Scoring

Score each identified threat 1–3 per dimension; total ÷ 5 = risk score.

| Dimension | 1 (Low) | 2 (Medium) | 3 (High) |
|-----------|---------|-----------|---------|
| **D**amage | Minimal data exposure | PII of single user | Full database or admin takeover |
| **R**eproducibility | Requires rare conditions | Reliable with effort | Trivially reproducible |
| **E**xploitability | Advanced skill needed | Moderate skill | Script kiddie / automated |
| **A**ffected users | 1 user | Group of users | All users |
| **D**iscoverability | Internal only | Requires access | Publicly visible |

## Threat Register Template

| ID | Component | STRIDE Category | Threat Statement | DREAD Score | Mitigation | Status |
|----|-----------|----------------|-----------------|-------------|-----------|--------|
| T-001 | Login API | Spoofing | Attacker brute-forces credentials via /auth/login | 2.4 | Rate limiting + MFA | Open |
| T-002 | User DB | Information Disclosure | SQL injection via search parameter reveals all records | 3.0 | Parameterised queries | Open |
