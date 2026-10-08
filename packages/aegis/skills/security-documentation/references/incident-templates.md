# Incident Templates — Reference

Use during Phase 3 to produce standardised incident records, severity classifications, and regulatory notification timelines.

## Incident Record Template

```markdown
# Incident Record — INC-[YYYY]-[NNNN]

**Incident Title:** [Brief descriptive title]
**Severity:** P[1/2/3/4]
**Status:** Open / Contained / Resolved / Closed
**Incident Commander:** [Name]
**Date/Time Detected:** YYYY-MM-DD HH:MM UTC
**Date/Time Declared:** YYYY-MM-DD HH:MM UTC
**Date/Time Resolved:** YYYY-MM-DD HH:MM UTC

---

## Summary
[One paragraph: what happened, how it was detected, current status]

## Affected Systems
| System | Impact | Owner |
|--------|--------|-------|
| [system name] | [description of impact] | [team/person] |

## Timeline
| Date/Time (UTC) | Event |
|----------------|-------|
| YYYY-MM-DD HH:MM | [What happened] |

## Indicators of Compromise (IOCs)
- File hash: [SHA256]
- IP address: [IP]
- Domain: [domain]

## Actions Taken
| Date/Time | Action | By Whom |
|-----------|--------|---------|
| | | |

## Regulatory Notification Required?
[ ] GDPR — 72-hour notification to supervisory authority
[ ] PCI DSS — Notify card brands and acquiring bank within 24 hours
[ ] NIS2 — 24-hour early warning; 72-hour incident notification
[ ] HIPAA — 60-day notification to HHS (and individuals if > 500 affected)

## Root Cause
[Identified after containment — what enabled the incident to occur]

## Lessons Learned
[Post-incident review findings]
```

## Severity Classification Table

| Severity | Criteria | Response SLA | Escalation |
|----------|----------|-------------|-----------|
| **P1 — Critical** | Active data breach; ransomware encrypting; critical system down; nation-state activity suspected | Declare in 15 min; contain within 1 hour | CEO, Board, Legal, DPO |
| **P2 — High** | Confirmed compromise of Tier 1/2 asset; significant data exposure risk; major service degraded | Declare in 30 min; contain within 4 hours | CISO, CTO, Legal |
| **P3 — Medium** | Isolated malware on single endpoint; suspicious activity under investigation; minor data exposure | Declare in 2 hours; contain within 24 hours | Security Manager, IT Director |
| **P4 — Low** | Policy violation; minor misconfiguration; no confirmed compromise | Acknowledge within 8 hours; resolve within 72 hours | Security Team Lead |

## Regulatory Notification Deadlines

| Regulation | Jurisdiction | Trigger | Initial Notification | Full Notification | Notify Who |
|------------|-------------|---------|---------------------|------------------|------------|
| GDPR | EU / EEA | Personal data breach with risk to individuals | 72 hours | 30 days (to individuals) | Supervisory authority (ICO in UK) + affected individuals |
| HIPAA Breach Notification Rule | USA | Breach of unsecured PHI | N/A — no early warning | 60 days from discovery (to HHS + individuals) | HHS Office for Civil Rights; patients |
| NIS2 Directive | EU | Significant incident affecting essential/important entity | 24 hours (early warning) | 72 hours (incident notification); 1 month (final) | National CSIRT / competent authority |
| PCI DSS v4.0 | Global (card data) | Suspected or confirmed account data compromise | Immediately (24 hours best practice) | As required by card brands | Card brands (Visa/MC/Amex) + acquiring bank |
| SEC Cybersecurity Rules | USA (public companies) | Material cybersecurity incident | 4 business days (8-K filing) | Annual disclosure (10-K) | SEC (public disclosure) |
