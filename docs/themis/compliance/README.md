# Themis compliance and threat-model set

This folder holds the responsible-design mappings that reviewers and security teams can read next to the code. None of it is a certification, audit or attestation. Every claim names a file, a symbol and a test, and anything Themis does not do is marked `GAP`.

| Document | What it answers | Source (retrieved 2026-10-11) |
|---|---|---|
| [owasp-llm.md](owasp-llm.md) | How Themis addresses each of the ten OWASP Top 10 for LLM Applications (2025) risks | https://genai.owasp.org/llm-top-10/ |
| [owasp-agentic.md](owasp-agentic.md) | How Themis addresses the ten OWASP Top 10 for Agentic Applications threats (ASI01 to ASI10) | https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/ |
| [nist-ai-rmf.md](nist-ai-rmf.md) | Which NIST AI RMF 1.0 functions and Generative AI Profile (NIST AI 600-1) actions the controls support | https://www.nist.gov/itl/ai-risk-management-framework and https://doi.org/10.6028/NIST.AI.600-1 |
| [Threat model (MITRE ATLAS)](../threat-model-atlas.md) | Themis's own threat model, written with ATLAS data version 2026.09 | https://github.com/mitre-atlas/atlas-data |
| [Control mapping to security frameworks](../compliance-mapping.md) | Ten implemented controls related to NIST CSF 2.0, ISO/IEC 27001:2022, SOC 2 and CIS Controls v8 | the frameworks' own published text |

## How they fit together

- **MITRE ATLAS is Themis's own threat model.** It starts from what an attacker could do to an agent that calls tools, and records the mitigation and the residual gap for each.
- **OWASP and NIST are the design mappings shown to reviewers.** They start from a published list and show which Themis control answers each item. The OWASP LLM list and the OWASP agentic list are different lists with different IDs and are never merged.
- **The framework control mapping** (NIST CSF, ISO 27001, SOC 2, CIS) relates the same ten controls to the usual audit frameworks. Its framework identifiers are carried from earlier work and have not been re-verified against live sources in this set.

## Controls most rows lean on

1. A write or execute tool call is only a proposal; a human decision is required and a model cannot supply it (`themis-core/src/approvals.ts:canExecuteApproval`).
2. A default-deny tool allowlist per skill (`themis-core/src/mcp/config.ts`, `mcp/tool-policy.ts`).
3. Redaction, size caps and untrusted-output wrapping on everything from external servers (`themis-gateway/src/gateway.ts`).
4. An append-only local audit log that fails the call if it cannot be written.

## Open gaps worth knowing first

- The gateway neutralises wrapper tags inside tool output (`packages/themis-gateway/test/wrapper-breakout.test.ts`); wrapping still only reduces the risk of injected instructions.
- The hosted Aegis MCP route has a best-effort rate limit (`apps/web/lib/rate-limit.ts`); it is in-memory per server instance and therefore not a hard quota on serverless hosting.
- Intel content in the skills is committed from the maintainer's machine, so the maintainer is a trust assumption.
- Tool descriptions from servers you connect reach the model unmodified (GAP: they are not wrapped).

To report a weakness in any control, see [SECURITY.md](../../../SECURITY.md).
