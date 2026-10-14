# Install Aegis

`aegis-skills` 1.5.0 is on npm, and the Claude Code plugin marketplace is this repository, so every command on this page works. If you would rather not install anything, use the [single-file prompts](./single-file-prompts.md) or the [hosted MCP server](./hosted-mcp.md).

## Requirements

- Node.js 24 or later for every `npx` command.
- No build tools.

## Claude Code

Inside Claude Code:

```
/plugin marketplace add drupadsachania/aegis-skills
/plugin install aegis-skills@aegis-skills
```

Or from a terminal:

```bash
npx aegis-skills install --platform claude
```

## Codex

```bash
npx aegis-skills install --platform codex
```

## Gemini CLI

```bash
gemini extensions install https://github.com/drupadsachania/aegis-skills
```

Or:

```bash
npx aegis-skills install --platform gemini
```

## Cursor

```bash
npx aegis-skills install --platform cursor
```

## VS Code Copilot

```bash
npx aegis-skills install --platform vscode
```

## Antigravity

```bash
npx aegis-skills install --platform antigravity
```

## User or project install

By default the skills go into your user folder. Add `--project` to install into the current folder instead, or `--dir <path>` to name another folder. `--platform all` installs for every platform. Without `--platform`, the installer targets every tool it finds in your home folder, and stops with an error if it finds none.

## Where files go

Paths were checked against each vendor's documentation on 2026-10-07. Every target below is enabled.

| Platform | User skills folder | Project skills folder | Verified on |
|---|---|---|---|
| Claude Code | `~/.claude/skills` | `.claude/skills` | 2026-10-07 |
| OpenAI Codex | `~/.agents/skills` | `.agents/skills` | 2026-10-07 |
| Gemini CLI | `~/.gemini/skills` | `.gemini/skills` | 2026-10-07 |
| Cursor | `~/.cursor/skills` | `.cursor/skills` | 2026-10-07 |
| VS Code (GitHub Copilot) | `~/.copilot/skills` | `.github/skills` | 2026-10-07 |
| Google Antigravity | `~/.gemini/config/skills` | `.agents/skills` | 2026-10-07 |

## What gets installed

Only `SKILL.md`, `skill.json` and `references/` for each skill. `intel-state.json` and anything else is never copied.

The installer also registers an `aegis` MCP server in the platform's own config file and saves a copy of that file as `<file>.aegis.bak` first. Pass `--no-mcp` to skip this. For VS Code at user level the installer does not write a file: it prints a `code --add-mcp` command for you to run. Aegis only replaces skill folders it installed itself; if a folder of the same name exists, it is skipped unless you pass `--force`, which backs it up.

## Update and uninstall

- `aegis update` re-syncs every recorded install now.
- `aegis uninstall` removes only what Aegis installed, and unregisters the MCP entry it added.
- After you upgrade the package, installed skills refresh automatically the next time you run `aegis`.
- A file you edited is saved as `<file>.bak` before it is replaced or removed.
- Opt out of the automatic refresh with `AEGIS_NO_AUTO_REFRESH=1`.

Aegis records its installs in `~/.aegis/installed.json` (set `AEGIS_HOME` to move it).

## Troubleshooting

- `npx` is stuck on a prompt: add `-y`, as in `npx -y aegis-skills install --platform claude`.
- Wrong Node version: run `node --version`; it must print v24 or higher.
- Not sure what is installed where: run `aegis list`.
