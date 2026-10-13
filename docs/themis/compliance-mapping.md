# Compliance mapping

**This is an informational mapping, not a certification.** It lists security controls that the Themis code implements today and the framework controls they relate to, so that a reviewer can see where Themis may help with an assessment. Aegis and Themis are not certified, audited or attested against any framework, and nothing here says they are. Passing an audit depends on how your organisation runs the tools, not on the tools alone.

Framework references are given at the level of control or category identifiers. The OWASP LLM identifiers in the table below were checked against the live OWASP list on 2026-10-11. The NIST CSF, ISO/IEC 27001, SOC 2 and CIS identifiers were written from the published frameworks and have not been re-verified against live sources; check them against the current text of each framework before you rely on them.

The deeper, per-risk mappings with code paths, tests and open gaps are in the compliance set, each written from the live published source with its retrieval date:

- [OWASP Top 10 for LLM Applications mapping](./compliance/owasp-llm.md)
- [OWASP Top 10 for Agentic Applications mapping](./compliance/owasp-agentic.md)
- [NIST AI RMF and Generative AI Profile mapping](./compliance/nist-ai-rmf.md)
- [Compliance set overview](./compliance/README.md)
- [Threat model (MITRE ATLAS)](./threat-model-atlas.md)
- [Privacy policy](./privacy-policy.md) and [reviewer test prompts](./test-prompts.md)

## What is mapped

Only controls that exist in the code are listed. Each one names where to find it.

| # | Control implemented | Where in the code |
|---|---|---|
| C1 | **Human-only approval.** Write and execute tool calls never run on a model's say-so. Only a human decision from the dashboard (after its session check) or your client's MCP elicitation prompt can approve, and only an approved, human-decided request can execute, once. | `themis-core` approvals and store, `themis-gateway`, plugin `approval.ts`, app `routes/approvals.ts`; `npm run check:deps` enforces the single deciding call sites |
| C2 | **Least-privilege allowlist.** Default-deny: no configured server means no external tools. A server is reachable only by its `allowedSkills`, and write and execute tools are offered only if `allowWrite` is true. | `themis-core` `mcp/config.ts` and `mcp/tool-policy.ts`, `themis-gateway` |
| C3 | **Audit log.** Every step, tool call, tool result, approval request and decision, finding and error is written to the local store. If the log cannot be written, the tool call fails. | `themis-core` audit log and store, `themis-gateway` |
| C4 | **Secret redaction.** Secrets and email addresses are redacted from approvals, audit data, findings, reports and tool output. | `themis-core` `secrets.ts` and `redact.ts` |
| C5 | **Untrusted-output wrapping and size cap.** External tool output is wrapped in an `<external_tool_output>` tag and cut at 4000 characters, so it is treated as data. | `themis-gateway` |
| C6 | **Call budgets and timeouts.** Per-server call budget (at most 20) and timeout (at most 30 seconds). | `themis-core` `mcp/config.ts`, `themis-gateway` |
| C7 | **Input validation.** Task text and context are sanitised and size-limited, and sub-task plans are capped and checked against real skills. | `themis-core` `sanitise.ts`, `planning.ts`, `workflow.ts` |
| C8 | **Authorization gate for exposure validation.** Missing authorization, unconfirmed scope or an expired window deny the work. The policy is plain code, not the model. | `themis-core` `exposure/policy.ts` |
| C9 | **Local-only operation and dashboard hardening.** Data stays in `~/.themis`. The dashboard binds to 127.0.0.1 and requires a per-launch session token, a Host allowlist, same-origin checks and a strict Content-Security-Policy, and sends no CORS headers. | `themis-app` server and its README |
| C10 | **Version stamping.** Every run and report records the Themis, Aegis and osk versions. | `themis-core` `version.ts` |

## Framework mapping

| Control | OWASP Top 10 for LLM Applications (2025) | NIST CSF 2.0 | ISO/IEC 27001:2022 Annex A | SOC 2 (2017 TSC) | CIS Controls v8 |
|---|---|---|---|---|---|
| C1 | LLM06 Excessive Agency | PR.AA | A.5.3, A.8.2 | CC6.1, CC6.3 | 6 |
| C2 | LLM06 Excessive Agency | PR.AA | A.5.15, A.8.3 | CC6.1, CC6.3 | 6 |
| C3 | | PR.PS, DE.CM | A.8.15 | CC7.2 | 8 |
| C4 | LLM02 Sensitive Information Disclosure | PR.DS | A.8.11 | CC6.1 | 3 |
| C5 | LLM01 Prompt Injection | | | | |
| C6 | LLM10 Unbounded Consumption | | | | |
| C7 | LLM01 Prompt Injection | | | | |
| C8 | LLM06 Excessive Agency | PR.AA | | | |
| C9 | | PR.AA | A.8.3 | CC6.1 | 6 |

C10 (version stamping) supports reproducibility but is not mapped to a specific framework control.

For the NIST AI Risk Management Framework, the human-approval, allowlist, audit and budget controls (C1 to C3, C6) support the Govern and Manage functions. This is a function-level relationship only.

## What this does not cover

- **Prompt injection is reduced, not solved.** Wrapping external output (C5) helps a model tell data from instructions, but it does not guarantee the model will ignore instructions inside tool output.
- **Plugin-mode boundary.** Tools you connect directly to your assistant bypass Themis, so none of C1 to C6 applies to them.
- **Model providers.** In standalone mode your task text and sub-task context are sent to the model provider you choose. Provider terms and data handling are outside Themis.
- **Windows key file.** The `.env` key file is created with mode `0600` on macOS and Linux only; on Windows it inherits your profile's permissions.
- **Organisational controls.** Policies, training, access reviews and evidence collection are your organisation's work. Themis can produce reports and an audit log that support them, but does not replace them.

To report a weakness in any of these controls, see [SECURITY.md](../../SECURITY.md).
