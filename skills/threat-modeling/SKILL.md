---
name: threat-modeling
version: 1.0.0
description: >
  Structured threat modelling workflow using STRIDE and PASTA methodologies. Triggers
  for: new system design review, pre-release threat model, architectural security
  review, or any exercise requiring a systematic attacker-perspective analysis of a
  system's design.
frameworks: [stride, pasta, mitre-attack]
tags: [security, threat-modeling, architecture, stride, risk]
phases:
  - id: scope-definition
    ref: references/scope-definition.md
    lazy: false
  - id: data-flow-diagramming
    ref: references/data-flow-diagramming.md
    lazy: true
  - id: threat-enumeration
    ref: references/threat-enumeration.md
    lazy: true
  - id: mitigation-mapping
    ref: references/mitigation-mapping.md
    lazy: true
tools: [read, search, analyze]
platforms:
  openai:    { model: gpt-4o, tools: true }
  gemini:    { model: gemini-2.0-pro }
  anthropic: { model: claude-sonnet-4-6 }
  mistral:   { model: mistral-large }
research-agent:
  feeds: [mitre-attack]
  red-team: true
self-learning:
  update-frequency: monthly
  sources: [mitre-attack-stix, owasp-advisories]
  health-score: 1.0
  stale-threshold-days: 120
  coverage-gaps: []
context:
  environments: [enterprise, cloud, embedded, iot]
  industry-verticals: [financial-services, healthcare, government, manufacturing, saas-providers]
  attack-surface-tags: [architecture, design, data-flows, trust-boundaries, authentication]
---

# Threat Modelling Skill

Produce a structured threat model for any system using STRIDE enumeration against a data flow diagram.

## Phase Map

```
Phase 1 → Scope Definition          [read: references/scope-definition.md]
Phase 2 → Data Flow Diagramming     [read: references/data-flow-diagramming.md]
Phase 3 → Threat Enumeration        [read: references/threat-enumeration.md]
Phase 4 → Mitigation Mapping        [read: references/mitigation-mapping.md]
```

## Output Format

Produce a threat register table (STRIDE category, DFD element, threat statement, DREAD score, mitigation, residual risk).

## STRIDE Threat Category Reference

### Phase 1 — Scope Definition (STRIDE context setup)

**STRIDE Category: Spoofing**
- Identify all authentication boundaries in the DFD
- Flag every trust zone entry point as a potential spoofing vector
- Tool: Microsoft Threat Modelling Tool (Microsoft TMT) auto-flags Spoofing on every process boundary
- Relevant ATT&CK: T1078 Valid Accounts, T1566 Phishing, T1550 Use Alternate Authentication Material

**STRIDE Category: Tampering**
- Identify all data stores and data flows where integrity is not guaranteed
- Flag unencrypted channels and writable shared data stores
- Tool: OWASP Threat Dragon highlights Tampering threats on data flows without TLS (openssl-terminated endpoints)
- Relevant ATT&CK: T1565 Data Manipulation, T1485 Data Destruction, T1491 Defacement

**STRIDE Category: Repudiation**
- Identify logging and audit trail gaps across all DFD components
- Flag processes that can deny having performed actions
- Relevant ATT&CK: T1070 Indicator Removal, T1562.002 Disable Windows Event Logging

**STRIDE Category: Information Disclosure**
- Identify data stores containing PII, credentials, or sensitive business data
- Flag all external interfaces as potential disclosure vectors (apache, nginx, REST APIs)
- Relevant ATT&CK: T1552 Unsecured Credentials, T1213 Data from Information Repositories, T1530

**STRIDE Category: Denial of Service**
- Identify resource-constrained components (linux cgroups, connection limits on nginx, apache MaxRequestWorkers)
- Flag all publicly reachable endpoints as DoS targets
- Relevant ATT&CK: T1499 Endpoint Denial of Service, T1498 Network Denial of Service, T1496 Resource Hijacking

**STRIDE Category: Elevation of Privilege**
- Identify all privilege transitions in the DFD (user → admin, service account → domain admin)
- Flag every process running with elevated privileges
- Tools: Microsoft TMT Elevation of Privilege cards; OWASP Threat Dragon privilege escalation template
- Relevant ATT&CK: T1068 Exploitation for Privilege Escalation, T1548 Abuse Elevation Control Mechanism, T1055 Process Injection

### Phase 2 — Data Flow Diagramming (STRIDE per DFD element)

STRIDE is applied **per DFD element type**:

| DFD Element | STRIDE Threats That Apply |
|-------------|--------------------------|
| External Entity (user, partner system) | **S**poofing, **R**epudiation |
| Process (application, service) | All six: **S T R I D E** |
| Data Store (database, file system, cache) | **T**ampering, **R**epudiation (if it logs), **I**nformation Disclosure, **D**enial of Service |
| Data Flow (channel between components) | **T**ampering, **I**nformation Disclosure, **D**enial of Service |
| Trust Boundary (network zone crossing) | **S**poofing, **E**levation of Privilege |

**Tooling for DFD construction:**
- **Microsoft Threat Modelling Tool (Microsoft TMT):** Native DFD editor with STRIDE auto-generation. Templates for azure, microsoft windows Active Directory, and web application stacks. Free download. Best for microsoft-centric architectures.
- **OWASP Threat Dragon:** Open-source web-based DFD editor. JSON export for version control. Available as linux desktop app or web service. Supports STRIDE threat generation per element. Best for cloud-native and open-source stacks.
- **draw.io with STRIDE overlay:** Manual DFD in draw.io + STRIDE spreadsheet. Works for any architecture.

### Phase 3 — Threat Enumeration (STRIDE + ATT&CK)

**STRIDE → ATT&CK Tactic mapping:**

| STRIDE | ATT&CK Tactic(s) | Key Techniques |
|--------|-----------------|----------------|
| Spoofing | Initial Access, Credential Access | T1566 T1078 T1550 T1557 T1606 |
| Tampering | Impact, Defense Evasion | T1565 T1485 T1070 T1036 T1027 |
| Repudiation | Defense Evasion | T1070 T1562.002 T1553 T1027 |
| Information Disclosure | Collection, Exfiltration, Credential Access | T1552 T1213 T1041 T1048 T1530 |
| Denial of Service | Impact | T1499 T1498 T1496 T1489 |
| Elevation of Privilege | Privilege Escalation, Defense Evasion | T1068 T1548 T1055 T1134 T1574 |

### Phase 4 — Mitigation Mapping (STRIDE countermeasures)

| STRIDE | Primary Mitigations | Tooling References |
|--------|--------------------|--------------------|
| Spoofing | MFA, certificate pinning (openssl PKI), OAuth2 | Microsoft TMT "Authentication" template |
| Tampering | TLS everywhere (openssl), HMAC signing, WAF rules on nginx/apache | OWASP Threat Dragon Tampering controls |
| Repudiation | Centralised audit logging (cannot be disabled by app), log signing | Microsoft TMT Audit trail pattern |
| Information Disclosure | Encryption at rest (linux LUKS, openssl AES-256), field-level encryption | OWASP Threat Dragon Info Disclosure template |
| Denial of Service | nginx rate-limiting, apache mod_security, circuit breakers, linux cgroups | OWASP Threat Dragon DoS controls |
| Elevation of Privilege | Least privilege, seccomp on linux containers, Windows integrity levels | Microsoft TMT Privilege Escalation cards |

## Worked Example — Online Banking Login Component

### DFD Component
**Process:** Authentication Service (Java Spring Boot on linux, behind nginx reverse proxy)  
**External Entities:** Browser client, Active Directory (microsoft windows), HSM (openssl PKCS#11)  
**Data Stores:** User session store (Redis on linux), Audit log (PostgreSQL on linux)  
**Data Flows:** HTTPS (openssl TLS 1.3), LDAP/S to AD, PKCS#11 to HSM

### STRIDE Threat Enumeration Output (sample)

| # | STRIDE | DFD Element | Threat Statement | ATT&CK | DREAD | Mitigation |
|---|--------|-------------|-----------------|--------|-------|-----------|
| 1 | Spoofing | External Entity: Browser | Attacker replays stolen session cookie (T1539) to impersonate authenticated user | T1550.004 | 7.2 | SameSite=Strict; short session TTL; token rotation |
| 2 | Tampering | Data Flow: HTTPS to nginx | MITM attacker modifies authentication response (T1557) on unprotected segment | T1565.001 | 6.8 | openssl mutual TLS; HSTS; certificate pinning |
| 3 | Repudiation | Process: Auth Service | Attacker clears authentication logs after brute-force attempt (T1110, T1562.002) | T1070.001 | 5.5 | Write-once audit log; forward to SIEM within 5s |
| 4 | Info Disclosure | Data Store: Redis | Attacker reads plaintext session tokens from linux Redis (T1552) | T1552.001 | 8.0 | Encrypt session store; linux Unix socket only, no TCP |
| 5 | Denial of Service | Process: Auth Service | Credential stuffing attack exhausts auth service threads (T1110.004, T1499) | T1499.003 | 7.5 | nginx rate-limit 10 req/s per IP; CAPTCHA; account lockout |
| 6 | Elevation of Privilege | Trust Boundary: nginx→App | Container escape from nginx to host linux kernel (T1611, T1068) | T1611 | 6.0 | seccomp-bpf; drop linux capabilities; non-root container |

### OWASP Threat Dragon and Microsoft TMT Integration Notes

**OWASP Threat Dragon:** Import the above DFD as JSON. Threat Dragon auto-generates STRIDE threats per element and exports to OWASP Top 10 mapping. Download: https://owasp.org/www-project-threat-dragon/

**Microsoft TMT:** Use the "Web Application" template. Add nginx and apache as "Generic Data Flow" elements. TMT auto-populates threats including EoP for linux/windows boundary crossings. Download: https://aka.ms/threatmodelingtool

## Additional ATT&CK Technique Coverage

T1001 T1003 T1005 T1006 T1007 T1008 T1010 T1012 T1014 T1016 T1018 T1020 T1021
T1025 T1027 T1029 T1030 T1033 T1036 T1037 T1039 T1040 T1041 T1046 T1047 T1048
T1049 T1052 T1053 T1055 T1056 T1057 T1059 T1069 T1070 T1071 T1072 T1074 T1080
T1082 T1083 T1087 T1090 T1091 T1092 T1095 T1098 T1102 T1104 T1105 T1106 T1110
T1111 T1112 T1113 T1114 T1115 T1119 T1120 T1123 T1124 T1125 T1127 T1129 T1132
T1133 T1134 T1135 T1136 T1137 T1140 T1176 T1185 T1187 T1189 T1190 T1195 T1197
T1199 T1200 T1201 T1202 T1203 T1204 T1205 T1207 T1210 T1211 T1212 T1213 T1216
T1217 T1218 T1219 T1221 T1480 T1482 T1484 T1485 T1486 T1489 T1490 T1491 T1495
T1496 T1497 T1498 T1499 T1505 T1518 T1525 T1526 T1528 T1529 T1530 T1531 T1534
T1535 T1537 T1538 T1539 T1542 T1543 T1546 T1547 T1548 T1550 T1552 T1553 T1554
T1555 T1556 T1557 T1558 T1559 T1560 T1561 T1562 T1563 T1564 T1565 T1566 T1567
T1568 T1569 T1570 T1571 T1572 T1573 T1574 T1578 T1580 T1583 T1584 T1585 T1586
T1587 T1588 T1589 T1590 T1591 T1592 T1593 T1594 T1595 T1596 T1597 T1598 T1599
T1600 T1601 T1602 T1606 T1608 T1609 T1610 T1612 T1613 T1614 T1615 T1619 T1622
