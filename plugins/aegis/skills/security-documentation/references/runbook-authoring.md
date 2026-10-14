# Runbook Authoring — Reference

Use during Phase 2 to write operational security runbooks that enable any trained analyst to execute the procedure correctly and consistently.

## Runbook Principles

1. **Assume nothing** — write for an analyst who has never performed this task before.
2. **One action per step** — each step should be a single, verifiable action.
3. **Include expected outcomes** — tell the analyst what success looks like at each step.
4. **Flag decision points** — make branching logic explicit (IF / THEN / ELSE).
5. **Keep it current** — runbooks must be reviewed when the underlying system changes.

## Runbook Structure Template

```markdown
# [Runbook Name]

**Runbook ID:** RB-[ID]
**Version:** 1.0
**Trigger:** [What event or condition initiates this runbook]
**Owner:** [Team / Role responsible for maintaining this runbook]
**Last Reviewed:** YYYY-MM-DD
**Estimated Duration:** [X minutes]

---

## Prerequisites
- Access required: [List systems/tools the analyst must have access to]
- Permissions required: [Specific permissions needed]
- Dependencies: [Other runbooks or procedures that must be completed first]

## Step-by-Step Procedure

### Step 1 — [Action title]
**Action:** [Specific action to perform]
**Command/UI path:** [Exact command or navigation path]
```
example command here
```
**Expected outcome:** [What the analyst should see if successful]
**If this fails:** [What to do if the expected outcome is not seen]

### Step 2 — [Action title]
[Repeat structure]

## Decision Points

### [Decision: e.g., Is the alert a true positive?]
- **YES** → Proceed to Step [N]
- **NO** → Proceed to Step [M] (false positive handling)

## Escalation Criteria
[When should the analyst escalate, and to whom?]

## Communication Templates
[Pre-written notification messages for stakeholders]

## Post-Procedure Actions
- [ ] Log actions taken in incident/change ticket
- [ ] Update asset inventory if changes made
- [ ] Notify stakeholders of completion
```

## Common Runbook Types

| Runbook Type | Trigger | Key Steps |
|-------------|---------|-----------|
| Phishing Response | Suspicious email reported | Analyse headers → block sender/URL → scan mailboxes → notify affected users |
| Account Compromise | Anomalous login alert | Force password reset → revoke sessions → review activity → notify user |
| Ransomware Containment | EDR alert on file encryption | Network isolate host → collect evidence → determine scope → initiate restore |
| DDoS Response | Traffic volume exceeds threshold | Enable scrubbing → activate CDN protection → notify ISP → monitor |
| Privileged Account Lockout | Admin locked out | Verify identity → unlock via break-glass → investigate cause → audit |

## Quality Checklist

- [ ] Every step has a single, testable action
- [ ] All commands tested in a non-production environment
- [ ] All tool/system names match current environment (no outdated names)
- [ ] Escalation path and contact details current
- [ ] Runbook reviewed by at least one analyst who did not write it
- [ ] Version controlled and stored in accessible location (not only on single person's laptop)
