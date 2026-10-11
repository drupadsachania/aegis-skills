# @aegis-skills/themis-plugin

Themis on your own AI. This package is an MCP server (`themis-mcp`) that runs the Themis security workflow with your assistant doing the reasoning, so no model API key is needed. Themis holds the workflow, enforces the governance rules and keeps a local audit log. It works with Claude Code, Codex and Gemini CLI.

Status: version 1.1.0, built and tested in the repository; not published yet. The install commands below work after the first release.

## Install

Claude Code, inside the app:

```
/plugin marketplace add drupadsachania/aegis-skills
/plugin install themis@aegis-skills
```

Any MCP client (the plugin works together with the `aegis` skill server):

```json
{
  "mcpServers": {
    "aegis": { "command": "npx", "args": ["-y", "aegis-skills", "mcp"] },
    "themis": { "command": "npx", "args": ["-y", "@aegis-skills/themis-plugin"] }
  }
}
```

Needs Node.js 24 or later.

## Tools

`themis_start_run`, `themis_submit_step`, `themis_get_run`, `themis_list_runs`, `themis_validate_exposure`, `themis_assess_risk`, `themis_record_finding`, `themis_get_report`, `themis_external_list` and `themis_external_call`.

In Claude Code the plugin also installs the `themis-orchestrator` skill and the `themis-subtask-runner` and `themis-guardrail-reviewer` agents.

## Approvals

Writes and executes on external tools never run on the model's say-so. When your client supports MCP elicitation, Themis asks you through the client's own prompt. When it does not, Themis returns `human_handoff` and does not run the action. The only code allowed to record an approval is the elicitation response handler.

External MCP servers are registered through the `THEMIS_MCP_SERVERS` environment variable of the `themis` server entry. Tools connected directly to your assistant bypass Themis and are not governed.

Runs, the audit log and approvals live in `~/.themis/themis.db` (override with `THEMIS_HOME`). To check a build with a real client, follow [`docs/manual-verification.md`](docs/manual-verification.md).

Documentation: https://aegis-skills.vercel.app/docs/themis/mode-1-plugin

## Licence

`Apache-2.0 OR MIT`
