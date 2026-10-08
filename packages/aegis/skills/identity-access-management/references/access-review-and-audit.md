# Access Review and Audit

## Purpose
Design and operate access certification campaigns, detect SoD violations, and produce access audit reports.

---

## 1. Entitlement Review Workflow

### Campaign Configuration
```
Campaign types:
  User Access Review:      Manager reviews all access for their direct reports
  Application Access Review: App owner reviews all users with access
  Privileged Access Review: Security team reviews all privileged accounts
  Service Account Review:  System owner reviews all service accounts

Workflow steps:
  1. Campaign launched: reviewers notified by email + in-app
  2. Review interface: Certify / Revoke / Escalate per entitlement
  3. Reminders: Day 5 and Day 8 of 10-day window
  4. Overdue escalation: manager of reviewer notified at Day 10
  5. Campaign close: all uncertified = AUTO-REVOKE
  6. Audit report generated: decisions, timestamps, reviewer identities
```

### Sample Size for Audit Evidence
```
Population size:    Sample size (AICPA guidance):
  1-25:             All
  26-50:            15
  51-99:            25
  100-249:          30
  250+:             40-60

For continuous controls (automation), test entire population.
For manual controls, sample as above.
```

---

## 2. SoD Conflict Detection Automation

### Detection Methods
```
Real-time (provisioning):
  When access request submitted:
    1. Check against SoD matrix: does requested role/permission conflict with existing?
    2. If conflict: block provisioning; notify requester and security team
    3. Allow only with documented compensating control and approver sign-off

Periodic batch (existing access):
  Weekly: run SoD analysis against all current user entitlements
  Report: all active SoD violations with owner, system, conflicting permissions
  SLA: violations remediated or accepted within 5 business days

Detection query example (pseudocode):
  FOR EACH user IN active_users:
    entitlements = get_all_entitlements(user)
    FOR EACH (perm_a, perm_b) IN sod_matrix WHERE status = "prohibited":
      IF perm_a IN entitlements AND perm_b IN entitlements:
        flag_violation(user, perm_a, perm_b)
```

---

## 3. Access Analytics

### Unused Entitlements Report
```
Logic:
  Last-used date per entitlement (from application access logs)
  Unused > 90 days: flag for review
  Unused > 180 days: recommend revoke
  Never used after provisioning: immediate investigation

Query (SQL example):
  SELECT user_id, entitlement_id, granted_date, last_used_date
  FROM entitlements e
  LEFT JOIN usage_log u ON e.user_id = u.user_id AND e.system = u.system
  WHERE last_used_date < DATEADD(day, -90, GETDATE()) OR last_used_date IS NULL
  ORDER BY last_used_date ASC
```

### Overprivileged Accounts Report
```
Signals of overprivilege:
  - User has access to more systems than their role template specifies
  - User is member of privileged group (Domain Admins) but role doesn't require it
  - User has admin rights on system they are not the owner of
  - Access accumulated over multiple role changes (access creep)

AD overprivilege detection:
  Get-ADUser -Filter * -Properties MemberOf | 
    Where-Object {$_.MemberOf -match "Domain Admins|Enterprise Admins"} |
    Select Name, SamAccountName
```

---

## 4. De-provisioning Verification

```
After leaver de-provisioning (automated and confirmed):

Verification checks:
  [ ] Azure AD / Okta account disabled (not deleted — preserve audit trail 90 days)
  [ ] All SSO-federated applications: session revoked
  [ ] VPN access removed
  [ ] Email disabled; auto-forward set (if business requirement) with time limit
  [ ] Privileged accounts removed from all admin groups
  [ ] Service accounts owned by departing employee: transferred to new owner
  [ ] SSH keys removed from all systems
  [ ] API keys revoked (check secrets manager + code repositories)
  [ ] Physical access cards deactivated
  [ ] Shared account passwords changed if departing user had access

Verification timing:
  Within 4 hours (involuntary/high-risk): all access removed
  Within 24 hours (standard): all access removed
  Within 5 days: final certification by manager

Audit trail: retain access records for terminated users for minimum 1 year.
```

---

## 5. IAM Programme Metrics

| Metric | Target | Frequency |
|--------|--------|-----------|
| Orphaned accounts (no HR record) | 0 | Daily |
| Leavers: access removed within SLA | > 99% | Monthly |
| MFA enrolment rate (all users) | > 98% | Monthly |
| Privileged accounts with standing access | 0 (all JIT) | Monthly |
| Access certification completion rate | > 99% | Per campaign |
| SoD violations resolved within SLA | > 95% | Monthly |
| Overdue access reviews | < 2% | Monthly |
| Unused entitlements (>90 days) | < 10% | Quarterly |
| De-provisioning verification pass rate | 100% | Monthly |
| Service accounts without named owner | 0 | Monthly |
