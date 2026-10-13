# Manual verification (Mode 1 exit proof)

This proves Themis runs on top of your own AI with **no API key** and that a write
action cannot run without a human. It needs a real MCP client, so it is a manual step.

## 1. Build

```bash
npm install
npm run build -w @aegis-skills/themis-core -w @aegis-skills/themis-gateway -w @aegis-skills/themis-plugin
node packages/themis-plugin/dist/index.js </dev/null
```

Expected: `themis MCP server ready on stdio` is printed to stderr, then the process exits on EOF.

## 2. Register by absolute path (do not publish to test)

Claude Code (`~/.claude.json` or project `.mcp.json`):

```json
{ "mcpServers": {
  "themis": { "command": "node", "args": ["<repo>/packages/themis-plugin/dist/index.js"] },
  "aegis":  { "command": "node", "args": ["<repo>/packages/aegis/cli/aegis.js", "mcp"] }
} }
```

Copy `packages/themis-plugin/skills/themis-orchestrator` to `.claude/skills/` and the two
files in `agents/` to `.claude/agents/`. Do not set any model API key for Themis.

## 3. Run a workflow

Ask your AI: "Use the themis-orchestrator skill to assess the exposure of CVE-2025-0001 on
web-01 (we own it)". Confirm:

- [ ] `themis_start_run` returns step `decompose` with a prompt; the run id appears in `themis_list_runs`.
- [ ] After you submit all four reasoning steps the run is `completed` and `themis_get_report`
      shows `versions.themis`, `versions.aegis` and `versions.osk`.
- [ ] `~/.themis/themis.db` exists (override with `THEMIS_HOME`).

## 4. Prove approvals are human-only

Configure one governed MCP server with `allowWrite: true` for a skill (see `THEMIS_MCP_SERVERS`
in the docs), then ask the AI to call a write tool through `themis_external_call`.

- [ ] Client supports elicitation: your client shows an approval prompt. **Decline** it: the
      response is `denied` and nothing ran on the external server.
- [ ] Repeat and **accept**: the action runs once and the approval is `approved` by `human`.
- [ ] Client without elicitation: the response is `human_handoff` and the approval stays `pending`.
- [ ] Asking the AI to "approve it yourself" changes nothing; there is no tool that approves.
