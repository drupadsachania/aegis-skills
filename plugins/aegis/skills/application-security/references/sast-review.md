# SAST Review — Reference

Use during Phase 2 to run and triage static analysis findings against the application codebase.

## SAST Tool Selection by Language

| Language/Platform | Primary Tool | Secondary Tool | Notes |
|-------------------|-------------|---------------|-------|
| Python | Bandit | Semgrep | Bandit for quick scan; Semgrep for custom rules |
| JavaScript / TypeScript | Semgrep | ESLint security plugin | Add `eslint-plugin-security` |
| Java | SpotBugs + Find Security Bugs | CodeQL | Find Security Bugs plugin adds security rules |
| Go | Gosec | Semgrep | `gosec ./...` |
| C# / .NET | Roslyn Security Guard | CodeQL | Integrate into MSBuild pipeline |
| Ruby | Brakeman | Semgrep | Brakeman is Rails-specific |
| PHP | PHPCS Security Audit | Semgrep | `phpcs --standard=Security` |
| Infrastructure as Code | Checkov, tfsec | KICS | Scan Terraform, CloudFormation, Kubernetes manifests |
| Any language | CodeQL (GitHub) | Semgrep OSS | Run in CI/CD via GitHub Actions |

## Integration into CI/CD Pipeline

```yaml
# GitHub Actions — Semgrep SAST
- name: Semgrep SAST
  uses: returntocorp/semgrep-action@v1
  with:
    config: >-
      p/owasp-top-ten
      p/secrets
      p/command-injection
  env:
    SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
```

## High-Priority Finding Categories

| Category | OWASP Reference | Example CWE | Priority |
|----------|----------------|-------------|---------|
| SQL Injection | A03:2021 Injection | CWE-89 | P1 — Fix before merge |
| Command Injection | A03:2021 | CWE-78 | P1 |
| Hardcoded credentials / secrets | A02:2021 Cryptographic Failures | CWE-798 | P1 |
| Path traversal | A01:2021 Broken Access Control | CWE-22 | P1 |
| Insecure deserialization | A08:2021 | CWE-502 | P1 |
| Cross-site scripting (XSS) | A03:2021 | CWE-79 | P2 |
| Weak cryptography | A02:2021 | CWE-327 | P2 |
| SSRF | A10:2021 | CWE-918 | P2 |
| Missing input validation | A03:2021 | CWE-20 | P2 |
| Insecure direct object reference | A01:2021 | CWE-639 | P2 |

## Triage Process

1. **Export findings** to CSV with severity, rule, file, line
2. **Deduplicate** — suppress known false positives with `nosec` / `semgrep ignore`
3. **Triage P1** — validate each Critical/High finding manually
4. **Create tickets** — one ticket per unique finding type per component
5. **Track metrics** — new findings per sprint, mean time to remediate by severity
