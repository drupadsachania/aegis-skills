# Dependency Audit — Reference

Use during Phase 3 to identify vulnerable and malicious third-party dependencies across the application supply chain.

## Tooling by Ecosystem

| Ecosystem | SCA Tool | Command | Advisory Database |
|-----------|---------|---------|------------------|
| npm / Node.js | `npm audit` / Snyk | `npm audit --audit-level=high` | NPM Advisory, GitHub Advisories |
| Python / pip | Safety / pip-audit | `pip-audit --requirement requirements.txt` | PyPA Advisory, OSV |
| Java / Maven | OWASP Dependency-Check | `mvn dependency-check:check` | NVD, GitHub Advisories |
| Java / Gradle | Snyk | `snyk test --all-sub-projects` | Snyk DB |
| Go | govulncheck | `govulncheck ./...` | Go Vulnerability DB |
| Ruby / Bundler | bundler-audit | `bundle audit check --update` | Ruby Advisory DB |
| .NET / NuGet | `dotnet list package --vulnerable` | Built-in to .NET 6+ | NuGet advisories |
| Docker / containers | Trivy | `trivy image myapp:latest` | Trivy advisory DB (NVD + OS advisories) |
| Kubernetes manifests | Trivy | `trivy config k8s/` | Trivy misconfig DB |

## Supply Chain Attack Indicators

| Indicator | Description | Mitigation |
|-----------|-------------|-----------|
| Typosquatting | Package name resembles popular package | Verify exact package name; check download count |
| Dependency confusion | Internal package name served from public registry | Private registry scope enforcement; `@scope/` prefix |
| Malicious maintainer takeover | Legitimate package hijacked post-publish | Pin exact versions; monitor for unexpected updates |
| Build script injection | `postinstall` scripts executing suspicious code | Review package.json scripts; use `--ignore-scripts` |
| Protestware | Package intentionally sabotaged by author | Dependency pinning + integrity hashes |

## Lockfile Policy

All projects must maintain lockfiles and commit them to version control:

| Ecosystem | Lockfile | Policy |
|-----------|---------|--------|
| npm | `package-lock.json` or `yarn.lock` | Committed; `npm ci` in CI (not `npm install`) |
| Python | `requirements.txt` with pinned versions | Or `poetry.lock` / `Pipfile.lock` |
| Go | `go.sum` | Committed; verified with `go mod verify` |
| Java | Dependency versions locked in `pom.xml` / `build.gradle` | Use BOM for transitive pinning |

## SBOM Generation

Generate a Software Bill of Materials for each release:
```bash
# Using Syft
syft packages myapp:latest -o cyclonedx-json > sbom.json

# Using npm
npx @cyclonedx/cyclonedx-npm --output-format JSON --output-file sbom.json
```

Submit SBOM to vulnerability databases for continuous monitoring.
