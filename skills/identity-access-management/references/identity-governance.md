# Identity Governance

## Purpose
Manage the full identity lifecycle (Joiners, Movers, Leavers), detect orphaned accounts, run access certification campaigns, and enforce segregation of duties.

---

## 1. Identity Lifecycle Management

### Joiners (New Employee/Contractor)
```
Trigger: HR system provisioning event (new hire record active)

Automated provisioning workflow:
  1. HR system creates employee record (Day 0)
  2. Identity Provider (Azure AD/Okta) creates identity (Day 0)
  3. Role-based access assignment from RBAC matrix (Day 0-1)
  4. Welcome email with self-service MFA enrolment instructions (Day 1)
  5. MFA enrolment deadline: first login or within 24h (enforced)
  6. System access verified and confirmed (Day 1-3)

Joiner checklist:
  [ ] Identity created in IdP
  [ ] MFA enrolled (phishing-resistant preferred)
  [ ] Role-based access groups assigned
  [ ] Privileged access: separate privileged account if role requires
  [ ] Training completion required before access to sensitive systems
  [ ] NDA and acceptable use policy acknowledged
```

### Movers (Role Change)
```
Trigger: HR system role change event

Workflow:
  1. HR system notifies IAM system of role change
  2. Existing access reviewed against new role requirements
  3. Access for old role REMOVED (don't accumulate access)
  4. New role access GRANTED
  5. Transition period: max 5 working days to complete access change
  6. Post-move access certification: manager confirms access is correct

Key risk: Access accumulation — users keeping old role access when moving.
Detection: entitlement review; user has access from multiple different role sets.
```

### Leavers (Termination)
```
Trigger: HR system termination event (voluntary or involuntary)

Timeline (from HR notification):
  Immediate (day 0, involuntary): All access revoked immediately; devices seized
  Within 24h (all terminations):  All cloud and application access disabled
  Within 48h:                     Service accounts transferred/disabled
  Within 5 days:                  Formal certification by manager that access removed

Departing employee risk mitigation:
  - Notify manager before informing employee (involuntary)
  - Revoke remote access (VPN, SSO) immediately
  - Disable email; set up auto-forward for legitimate business continuity
  - Transfer ownership of business files before account deletion
  - Audit privileged access for recent unusual activity (look-back 30 days)
```

---

## 2. Orphaned Account Detection

```
Definition: Active account with no associated active employee/contractor in HR system

Detection:
  1. Daily sync: compare IdP accounts to HR active employee list
  2. Flag accounts where HR record is inactive but IdP account is active
  3. Service accounts: flag accounts not associated with a named owner
  4. Dormant detection: accounts with last login > 90 days (standard user)
                        accounts with last login > 30 days (privileged user)

Remediation SLA:
  Orphaned accounts (no HR record):   Disable within 24h; delete within 30 days
  Dormant standard accounts:          Manager notification; disable if no response in 5 days
  Dormant privileged accounts:        Immediate disable; investigation
```

---

## 3. Access Certification Campaigns

### Campaign Frequency
| Account Type | Frequency | Reviewer |
|-------------|-----------|---------|
| Standard user — sensitive systems | Quarterly | Manager |
| Standard user — non-sensitive | Annual | Manager |
| Privileged accounts | Quarterly | Security team + Manager |
| Service accounts | Quarterly | System/App owner |
| External/contractor accounts | Quarterly | Sponsor |

### Certification Decision Options
```
Certify:  Access is appropriate for user's role → retain
Revoke:   Access is no longer needed or appropriate → remove immediately
Escalate: Reviewer is unsure; requires additional review by security team

SLA:
  Reviewers must respond within 10 working days of campaign open
  Reminders at day 5 and day 8
  Unreviewed access at campaign close = AUTO-REVOKE (fail-safe)
```

---

## 4. Segregation of Duties (SoD)

### Common Toxic Combinations
| Domain | Toxic Combination | Risk |
|--------|------------------|------|
| Finance | AP entry + AP approval | Fraud: approve own invoices |
| Finance | GL entry + GL reconciliation | Manipulation: hide errors or fraud |
| Finance | Payroll maintenance + payroll processing | Ghost employees |
| IT | Change requester + change approver | Unauthorised changes |
| IT | Security admin + audit log access | Cover tracks after breach |
| Procurement | PO creation + goods receipt | Fictitious purchases |

### SoD Matrix Design
```
For each sensitive permission pair:
  Prohibited:     Combination must never co-exist (toxic combination)
  Controlled:     Combination allowed only with compensating control (dual approval)
  Permitted:      Combination is acceptable

Implementation:
  1. Document prohibited combinations in SoD matrix
  2. Configure IAM system to prevent provisioning of prohibited combinations
  3. Run periodic batch detection for existing violations
  4. Violations: immediate investigation + remediation within 5 days
```
