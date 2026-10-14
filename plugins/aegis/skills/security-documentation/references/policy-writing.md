# Policy Writing — Reference

Use during Phase 1 to author clear, audit-ready security policies following a consistent structure.

## Policy Structure Template

```markdown
# [Policy Name] Policy

**Policy ID:** POL-[ID]
**Version:** 1.0
**Effective Date:** YYYY-MM-DD
**Review Date:** YYYY-MM-DD (typically 12 months from effective date)
**Owner:** [Job Title, e.g., Chief Information Security Officer]
**Approved By:** [Name, Title]

---

## 1. Purpose
[One to two sentences explaining why this policy exists and what risk it addresses.]

## 2. Scope
[Clearly state who and what this policy applies to: employees, contractors, systems, data types, geographic regions.]

## 3. Policy Statements
[Numbered list of specific, measurable, enforceable requirements.]

3.1 All [subject] must [action] when [condition].
3.2 [Subject] must not [prohibited action].
3.3 [Subject] should [recommended action] to [achieve outcome].

## 4. Roles and Responsibilities
| Role | Responsibility |
|------|---------------|
| [Role] | [What this role must do under this policy] |

## 5. Compliance and Enforcement
[Consequences of non-compliance. Reference to disciplinary procedure.]

## 6. Related Documents
- [Procedure/Standard name] — [Document ID]
- [Related policy name] — [Document ID]

## 7. Revision History
| Version | Date | Author | Change Summary |
|---------|------|--------|----------------|
| 1.0 | YYYY-MM-DD | [Name] | Initial release |
```

## Language Guidelines

| Term | Usage | Example |
|------|-------|---------|
| **must** | Mandatory requirement — no exceptions without formal approval | "All users must enable MFA." |
| **must not** | Absolute prohibition | "Administrators must not share privileged account credentials." |
| **should** | Recommended best practice; deviation must be documented | "Systems should use HTTPS for all external communications." |
| **may** | Permissive; discretionary | "Users may request exceptions via the security exception process." |

Never use "should" when you mean "must". Auditors read "should" as optional.

## Common Policy Types

| Policy | Addresses | Key Frameworks |
|--------|-----------|---------------|
| Acceptable Use Policy (AUP) | Permitted use of company systems and data | ISO 27001 A.8.1 |
| Access Control Policy | User provisioning, MFA, privileged access | ISO 27001 A.8.5, PCI DSS Req 7/8 |
| Incident Response Policy | IR process, roles, escalation, notification | ISO 27001 A.5.26, NIST CSF RS |
| Password / Authentication Policy | Password complexity, rotation, MFA | CIS Controls 5, NIST SP 800-63 |
| Data Classification Policy | Data tiers, handling requirements, retention | ISO 27001 A.5.12 |
| Vulnerability Management Policy | Scan frequency, SLAs by severity | PCI DSS Req 6/11 |
| Third-Party / Supplier Security Policy | Vendor assessment, contractual requirements | ISO 27001 A.5.19 |
| Cryptography Policy | Approved algorithms, key management | ISO 27001 A.8.24 |
