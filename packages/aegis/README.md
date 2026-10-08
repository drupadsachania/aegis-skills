# aegis-skills

24 defensive cybersecurity skills in the open [Agent Skills](https://agentskills.io/specification) format, with a native installer and a read-only MCP server.

## Install

    npx aegis-skills install --platform claude          # or codex, gemini, cursor, vscode, antigravity, all
    npx aegis-skills install --platform claude --project

Skills go into each tool's own skills folder and the `aegis` MCP server is registered in its config (the file is backed up first). After an upgrade, installed skills refresh automatically; files you edited are kept as `.bak`. Opt out with `AEGIS_NO_AUTO_REFRESH=1`.

Claude Code plugin: `/plugin marketplace add drupadsachania/aegis-skills`, then `/plugin install aegis@aegis-skills`.

## Commands

`install` (alias `init`), `uninstall`, `update`, `list`, `mcp`. Run `aegis --help`.

## MCP

`npx aegis-skills mcp` serves `list_skills`, `get_skill` and `get_skill_phase` on stdio. Hosted: `https://aegis-skills.vercel.app/api/mcp`.

Every skill is for defensive use on systems you own or are explicitly authorized to assess.

Licence: Apache-2.0 OR MIT.
