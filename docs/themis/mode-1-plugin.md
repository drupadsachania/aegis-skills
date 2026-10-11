# Themis on your AI

In plugin mode your own assistant is the model. Themis runs as a local MCP server (`themis-mcp`) that holds the workflow, enforces the rules and keeps the audit log, while your assistant does the reasoning steps. No API key is involved.

Status: the plugin is version 1.1.0 and is built and tested in the repository. The installs below work after the first release.

## Requirements

- Claude Code, Codex or Gemini CLI.
- Node.js 24 or later.
- No API key.

## Install

Claude Code, inside the app:

```
/plugin marketplace add drupadsachania/aegis-skills
/plugin install themis@aegis-skills
```

Codex, add to `~/.codex/config.toml`:

```toml
[mcp_servers.aegis]
command = "npx"
args = ["-y", "aegis-skills", "mcp"]

[mcp_servers.themis]
command = "npx"
args = ["-y", "@aegis-skills/themis-plugin"]
```

Gemini CLI, add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "aegis": {
      "command": "npx",
      "args": ["-y", "aegis-skills", "mcp"]
    },
    "themis": {
      "command": "npx",
      "args": ["-y", "@aegis-skills/themis-plugin"]
    }
  }
}
```

## What you get

The `themis` MCP server exposes ten tools.

| Tool | What it does |
|---|---|
| `themis_start_run` | Start a governed run for a task. Returns the first reasoning step and its instructions. |
| `themis_submit_step` | Submit your assistant's output for the current reasoning step and advance the run. |
| `themis_get_run` | The current, redacted state of a run. |
| `themis_list_runs` | Recent runs. |
| `themis_validate_exposure` | Deterministic exposure rules: authorization policy, detection, exploitability, verification and risk. You supply the evidence and the exposure and impact states; it never infers them and never executes anything. |
| `themis_assess_risk` | Score risk from evidenced factors with the deterministic risk model. |
| `themis_record_finding` | Record a finding on a run, in the local store only. |
| `themis_get_report` | The stamped report and findings for a run. |
| `themis_external_list` | The governed external tools available to a run for a skill. |
| `themis_external_call` | Call a governed external tool. |

In Claude Code the plugin also installs the `themis-orchestrator` skill, which tells the assistant the loop to follow, and two sub-agents, `themis-subtask-runner` and `themis-guardrail-reviewer`. Where a host supports sub-agents the ready sub-tasks can run in parallel; otherwise your assistant runs them one at a time. On other hosts the tools alone work, because each reasoning step returns its own prompt.

## External security tools

Register external MCP servers with Themis (see [Configuration](./configuration.md)) and they appear as `themis__<server>__<tool>`.

- Reads run immediately, within a per-server call budget and timeout. The output is redacted and wrapped as untrusted data, and the call is audited.
- Writes and executes return an approval request instead of running.

## Approvals

When a write or execute call needs approval, Themis asks you through MCP elicitation, which is your client's own prompt, if the client supports it. Your answer is the only thing that can approve the action.

If your client does not support elicitation, Themis never runs the action. It returns `human_handoff` with the proposed action, and you run it yourself with your assistant's own permission-gated tools. The approval stays pending. See [Governance](./governance.md).

## Honest boundary

Tools connected directly to your assistant bypass Themis. They are not budgeted, redacted, approved or audited. Only tools reached through `themis_external_call` are governed.

## Runs and history

Runs, the audit log and approvals are stored in `~/.themis/themis.db` (set `THEMIS_HOME` to move it). You can look a run up again by its run id with `themis_get_run` or `themis_get_report`.

## Example

```
Use Themis to validate exposure to CVE-2026-12345 on vpn.example.internal.
I am authorized to assess it. Follow the themis-orchestrator loop, use only
Aegis skills, and show me the report when the run completes.
```
