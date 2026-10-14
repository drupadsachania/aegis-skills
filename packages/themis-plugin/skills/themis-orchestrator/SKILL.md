---
name: themis-orchestrator
description: >-
  Coordinates a governed, multi-step security workflow (validate, decompose,
  schedule, fan-out, guardrail, synthesise, audit) by driving the Themis MCP
  tools. Use when the user asks for a security assessment, exposure validation,
  threat hunt, or any task that should run under tool governance and an audit
  trail rather than ad-hoc tool calls.
license: Apache-2.0 OR MIT
metadata:
  version: "1.1.0"
  osk: "1.1"
  family: "domain"
---

# Themis Orchestrator

## Scope and authorization

- Purpose: Run defensive security workflows under human-approved, audited tool use.
- Use only on systems you own or are explicitly authorized to assess.
- Out of scope: Acting on third-party systems without authorization; approving your own tool calls.
- No network or API calls of your own: never use web fetch, a browser, shell network commands or any other API directly. The only external calls are proposals through `themis_external_call`, and every one waits for a human approval.
- Redact secrets, credentials, personal data and samples from anything you put in a step output or a tool argument.

## The loop you MUST follow

1. Call `themis_start_run` with the task. It returns `{ runId, step, prompt }`.
2. Reason over `prompt` to produce the output for `step`, then call
   `themis_submit_step { runId, step, output }`. The exact `output` shape for every
   step is in [the step reference](references/loop-and-outputs.md).
3. Repeat until the response has `status: "completed"`, then read the result with
   `themis_get_report { runId }`.

Deterministic steps (validate, schedule, audit) run inside Themis. You only ever
reason about `decompose`, `fanout`, `guardrail` and `synthesise`.

## Running sub-tasks (fan-out)

- The `fanout` response lists the sub-tasks that are ready now. Later stages appear
  after you submit earlier ones, so expect more than one `fanout` round when
  sub-tasks depend on each other.
- Where your host supports sub-agents, dispatch `themis-subtask-runner` per ready
  sub-task. Otherwise run them yourself, one at a time.
- Submit ALL results for the ready list in one `fanout` call, never one by one.

## Using external security tools

- Call `themis_external_list { runId, skill }`, then
  `themis_external_call { runId, skill, tool, args, reason }`.
- Never call those servers directly. Only calls through `themis_external_call` are
  budgeted, redacted and audited, and every call (read, write or execute) waits for a
  human approval before anything runs.

## Honest boundary

- Tools connected directly to this host AI bypass Themis. They are NOT governed or
  audited. Only `themis_external_call` is.

## Never self-approve

- Every external tool call is approved by the human in your client's own prompt, or
  handed back (`status: "human_handoff"`) for the human to run. Never attempt to
  approve it yourself, infer approval, or retry it to force it through.
