# Governance and approvals

These rules are enforced in code, in the shared Themis packages, not by prompting the model. They apply in both modes.

## Tool classes

Every external tool is classified as `read`, `write` or `execute` before anyone can call it. The classification is conservative. A tool counts as `read` only if its server marks it read-only and nothing in its name or description suggests a write or execute verb. Anything else is treated as `write`, and names that suggest running a command or deploying something are `execute`.

| Class | Disposition |
|---|---|
| `read` | Runs automatically, within the limits below. |
| `write`, `execute` | Never run on a model's say-so. Each call becomes an approval request. |

## Approval lifecycle

An approval request records the run, the server, the tool, the class, the arguments (redacted) and a reason. It starts as `pending` and is decided as `approved` or `rejected`. The `decidedBy` field is always `human` once it is decided. The type also has an `expired` status, but nothing produces it today: approvals do not expire.

Themis only executes an approval that is `approved` and decided by a human, once. If Themis restarted after the request was proposed, the unredacted arguments are gone from memory, so an approval whose stored arguments contained secrets cannot run. The standalone app shows that outcome as `needs_reproposal` and nothing is executed from redacted values.

## Who can approve

Only two things can approve an action:

- the dashboard's Approvals page, after its session-token check (standalone), and
- your client's own MCP elicitation prompt, answered by you (plugin).

No tool, workflow node or model output can approve. The repository's dependency check (`npm run check:deps`) fails if any other code calls the store's approval-deciding function, and tests cover each path. MCP sampling, which asks the model rather than the human, is never used for approvals.

## Limits

- **Call budget and timeout.** Each server has `maxCalls` (default 5, at most 20) and `timeoutMs` (default 15000, at most 30000). The budget counts read calls per server for one run and skill.
- **Secret redaction.** What Themis stores or returns is redacted (approval arguments, audit data, findings, reports and tool output): cloud keys, GitHub tokens, key-like strings, private key blocks and email addresses, plus any field whose name suggests a secret.
- **Size cap.** Tool output is cut at 4000 characters.
- **Untrusted wrapping.** Output reaches the model wrapped as `<external_tool_output server="..." tool="..." ok="...">...</external_tool_output>`, so it can be recognised as data, not instructions.

## Allowlists

Access is default-deny. If no servers are configured, no external tools are offered. A server is reachable only by the skills named in its `allowedSkills`, or by every skill if you list `*` on purpose. A server's write and execute tools are only offered if its `allowWrite` is `true`; otherwise they are left out entirely.

## Audit log

Every run has an audit log in the local SQLite store. Event kinds are `step`, `tool_call`, `tool_result`, `approval_requested`, `approval_decided`, `finding` and `error`. All event data is redacted before it is written, and if the log cannot be written, the tool call fails instead of running unaudited.

## Failure behaviour

If an external server is unreachable or misbehaves, Themis offers no tools from it and the run continues. A gateway failure comes back as an error result and never crashes a run.

## Honest boundary

In plugin mode, tools you connect directly to your assistant bypass Themis. They are not budgeted, redacted, approved or audited. Register security tools with Themis to govern them. In standalone mode every tool call goes through the gateway.
