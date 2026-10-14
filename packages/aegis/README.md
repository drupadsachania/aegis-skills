# aegis-skills

24 defensive cybersecurity skills in the open [Agent Skills](https://agentskills.io/specification) format, with a native installer and a read-only MCP server.

## Install

    npx aegis-skills install --platform claude          # or codex, gemini, cursor, vscode, antigravity, all
    npx aegis-skills install --platform claude --project

Skills go into each tool's own skills folder and the `aegis` MCP server is registered in its config (the file is backed up first). After an upgrade, installed skills refresh automatically; files you edited are kept as `.bak`. Opt out with `AEGIS_NO_AUTO_REFRESH=1`.

Claude Code plugin: `/plugin marketplace add drupadsachania/aegis-skills`, then `/plugin install aegis-skills@aegis-skills`.

## Commands

`install` (alias `init`), `uninstall`, `update`, `list`, `mcp`. Run `aegis --help`.

## MCP

`npx aegis-skills mcp` serves `list_skills`, `get_skill` and `get_skill_phase` on stdio. Hosted: `https://aegis-skills.vercel.app/api/mcp`.

## What this plugin runs, sends and fetches

- **Claude Code plugin (`.mcp.json`):** connects to one remote MCP server, `https://aegis-skills.vercel.app/api/mcp`. It runs no local command. The three tools (`list_skills`, `get_skill`, `get_skill_phase`) are read-only and return fixed public skill text. What is sent is the tool call itself (a skill name, a phase or a search word) and the usual request metadata such as your IP address. The server keeps only an in-memory request counter, makes no model calls and stores nothing. The skills themselves are plain Markdown that your assistant reads locally.
- **`npx aegis-skills` (the installer and stdio server):** runs the pinned npm package `aegis-skills`. `install` writes skill files into your tool's skills folder and adds an `aegis` entry to its MCP config (backed up first). A ledger of what it installed is kept under `~/.aegis` (override with `AEGIS_HOME`). `mcp` serves the same three read-only tools from the bundled skills on stdio. Neither command makes a network request of its own beyond npm downloading the package.
- No telemetry, no analytics and no credentials. Nothing is read from your conversations, memory or uploaded files.

Every skill is for defensive use on systems you own or are explicitly authorized to assess.

Licence: Apache-2.0 OR MIT.
