# Mitigation Mapping — Reference

Use during Phase 4 to select, assign, and track mitigations for all threats in the threat register.

## Control Selection Framework

| Control Category | Examples | Best Applied To | STRIDE Categories Addressed |
|-----------------|---------|----------------|------------------------------|
| **Prevent** | Input validation, authentication, authorisation, encryption | Threats where the attack can be blocked before impact | S, T, I, E |
| **Detect** | Logging, alerting, anomaly detection, SIEM rules | Threats that cannot be fully prevented; need timely detection | R, D, T |
| **Respond** | Incident response playbooks, automated blocking, circuit breakers | Threats that may succeed despite prevention; limit blast radius | D |
| **Recover** | Backup/restore, redundancy, DR plans | Availability threats | D |

## Mitigation Register Template

| Threat ID | Threat Statement | Control Type | Mitigation Description | Implementation Owner | Completion Date | Status | Residual Risk |
|-----------|-----------------|-------------|----------------------|---------------------|----------------|--------|--------------|
| T-001 | Credential brute force on login | Prevent + Detect | Rate limit (5 req/min/IP) + MFA enforcement + alert on 10 failed logins | Auth Team | 2025-08-01 | In Progress | Low |
| T-002 | SQL injection in search | Prevent | Replace string concatenation with parameterised queries (ORM) | API Team | 2025-07-15 | Open | Low after fix |
| T-003 | JWT replay attack | Prevent | Add `jti` claim with server-side nonce store; reduce expiry to 5 min | Platform Team | 2025-08-15 | Open | Medium |

## Residual Risk Assessment

After controls are implemented, re-score each threat:

| Residual Risk Level | Criteria | Action |
|---------------------|---------|--------|
| Low | DREAD score after mitigation < 1.5 | Accept; document |
| Medium | DREAD 1.5–2.0 after mitigation | Accept with monitoring; review quarterly |
| High | DREAD > 2.0 after mitigation | Do not accept; additional control required |
| Critical | DREAD ≥ 2.5 after mitigation | Escalate to CISO; block release |

## Threat Model Sign-off Checklist

- [ ] All P1 threats (DREAD ≥ 2.5) have mitigations implemented or formally accepted
- [ ] All P2 threats (DREAD 2.0–2.4) have mitigations with assigned owners and due dates
- [ ] Residual risk levels accepted by system owner in writing
- [ ] Threat model document stored in project repository with version and review date
- [ ] Next scheduled review date set (recommend: every 6 months or on significant design change)
- [ ] Security team sign-off obtained
- [ ] Threat model output fed into security test plan
