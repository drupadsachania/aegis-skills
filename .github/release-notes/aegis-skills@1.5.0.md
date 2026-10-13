## aegis-skills 1.5.0 - first release of the `aegis-skills` package

Aegis is a library of 24 defensive cybersecurity skills in the open Agent Skills format (MITRE ATT&CK, ATLAS and Engage, threat hunting, DFIR, exposure validation, identity, endpoint, network and OT security, compliance, risk and more). Every skill states its defensive purpose, an authorization assumption and what it will not do. The package adds a native installer for six AI tools and a read-only MCP server with three tools (`list_skills`, `get_skill`, `get_skill_phase`).

This is the first release under the name `aegis-skills`. It was built and tested in this repository, and it is published from GitHub Actions with npm provenance. Treat it as a first release: report problems at https://github.com/drupadsachania/aegis-skills/issues.

### Install

    npx aegis-skills install --platform claude          # or codex, gemini, cursor, vscode, antigravity, all
    npx aegis-skills install --platform claude --project

Needs Node.js 24 or later. The installer writes skills into the tool's own skills folder and registers the `aegis` MCP server in its config (the file is backed up first). The MCP server on its own: `npx aegis-skills mcp`.

### Replaces `@aegis-skills/core`

`@aegis-skills/core` (last version 1.0.0) is deprecated. It was one package that mixed the skills, a website and an early agent. The pieces are now separate:

| You used | Use now |
|---|---|
| `npm i -g @aegis-skills/core` then `aegis init` | `npx aegis-skills install --platform <claude\|codex\|gemini\|cursor\|vscode\|antigravity>` |
| the `aegis` MCP server from core | `npx aegis-skills mcp` (read-only: `list_skills`, `get_skill`, `get_skill_phase`) |
| the Themis agent inside core | Not available yet. Themis is in development and is not part of this release. |

Migrate:

1. `npm uninstall -g @aegis-skills/core`
2. `npx aegis-skills install --platform <your platform>`. Skills you edited are kept as `.bak`.
3. Gemini CLI: `gemini extensions install https://github.com/drupadsachania/aegis-skills`

### Assets on this release

- one zip per skill (`aegis-skill-<name>-1.5.0.zip`, Agent Skills format), identical to the downloads on the website;
- `aegis-prompts-1.5.0.zip`: one flattened single-file prompt per skill, with an "intel as of" date;
- `darwin.aegis-skills.zip`, `linux.aegis-skills.zip`, `win32.aegis-skills.zip`: the Gemini CLI extension (the manifest is at the archive root; its MCP server runs the pinned npm package, so it needs network access on first use);
- `aegis-chatgpt-plugin-1.5.0.zip`: the skills-only plugin package prepared for the ChatGPT plugin directory. It has not been submitted and is not listed anywhere yet;
- the npm tarball and `SHA256SUMS`.

Licence: Apache-2.0 OR MIT.
