# Configuration Baseline — Reference

Use during Phase 2 to assess infrastructure configuration against CIS Benchmarks and organisational hardening standards.

## CIS Benchmark Coverage by Platform

| Platform | CIS Benchmark | Key Assessment Areas | Assessment Tool |
|----------|--------------|---------------------|-----------------|
| Windows Server 2022 | CIS v3.0 | Account policies, audit policy, Windows Defender, firewall, services | CIS-CAT Pro, LGPO |
| Ubuntu 22.04 LTS | CIS v1.0 | SSH config, PAM, filesystem mounts, sysctl, cron, logging | Lynis, InSpec |
| RHEL / CentOS 9 | CIS v1.0 | SELinux, auditd, SSH, firewalld, package management | OpenSCAP, InSpec |
| macOS Ventura | CIS v2.1 | FileVault, Gatekeeper, SIP, firewall, screen lock | Jamf compliance, mSCP |
| Kubernetes 1.29 | CIS v1.8 | API server flags, etcd, kubelet, RBAC, network policies | kube-bench |
| AWS Foundations | CIS v2.0 | IAM policies, CloudTrail, S3, SecurityHub, GuardDuty | Prowler, ScoutSuite |
| Azure Foundations | CIS v2.1 | Defender for Cloud, logging, NSGs, IAM, Key Vault | Prowler, Azure Policy |

## Assessment Approach

1. **Automated scan** — run CIS-CAT Pro or equivalent to generate pass/fail report
2. **Manual verification** — spot-check Tier 1 assets manually (CIS-CAT may miss runtime config)
3. **Deviation register** — document all failed checks with risk justification or remediation plan
4. **Baseline lock** — approved baseline stored as golden AMI / DSC config / Ansible playbook

## High-Priority CIS Checks

| Check | Applies To | Why Critical |
|-------|-----------|--------------|
| Disable Guest account | Windows | Credential access (T1078) |
| SSH root login disabled | Linux | Privilege escalation via brute force |
| Password minimum length ≥ 14 | All | Credential brute force resistance |
| Audit logon events (Success+Failure) | Windows | Detection of T1078, T1110 |
| Firewall enabled + inbound blocked | All | Reduce exposure to T1046 |
| Auto-update enabled | All | Patch management coverage |

## Baseline Deviation Register Template

| Asset | CIS Check | Status | Risk | Justification | Remediation Owner | Due Date |
|-------|-----------|--------|------|---------------|------------------|----------|
| dc01 | 2.3.7.4 — Deny logon locally | Fail | High | No business exception | IT Ops | 2025-07-01 |
