# Getting started with npx

A step-by-step guide to installing the Aegis skill pack into a coding assistant with one `npx` command, checking that it worked, and using it for the first time. It takes about five minutes. For the full list of folders and options, see the [install reference](./install.md) and the [CLI reference](./cli.md).

## Before you start

- Node.js 24 or later. Run `node --version`; it must print `v24` or higher.
- One of the supported assistants: Claude Code, Codex, Gemini CLI, Cursor, VS Code with GitHub Copilot, or Google Antigravity.
- No account, no API key and no build tools. Aegis never calls a model.

If you use Claude.ai or ChatGPT in the browser, a coding assistant is not needed: use the [single-file prompts](./single-file-prompts.md) or the [hosted MCP server](./hosted-mcp.md) instead.

## 1. Choose where the skills go

You have two choices.

- **For you, in every project (user install).** The default. The skills go into your assistant's folder in your home directory.
- **For one project only (project install).** Add `--project`. The skills go into the current folder, so you can commit them and share them with your team.

If you are unsure, start with a project install in a scratch folder. It is easy to delete.

## 2. Run the installer

Pick your assistant.

| Assistant | Command |
|---|---|
| Claude Code | `npx aegis-skills install --platform claude` |
| Codex | `npx aegis-skills install --platform codex` |
| Gemini CLI | `npx aegis-skills install --platform gemini` |
| Cursor | `npx aegis-skills install --platform cursor` |
| VS Code Copilot | `npx aegis-skills install --platform vscode` |
| Antigravity | `npx aegis-skills install --platform antigravity` |

Add `--project` to any of them for a project install. To install for several assistants at once, list them: `--platform claude,codex`, or use `--platform all`.

Claude Code can also install Aegis as a plugin, without `npx`:

```
/plugin marketplace add drupadsachania/aegis-skills
/plugin install aegis-skills@aegis-skills
```

On a clean project the installer prints this (the folder path is shortened here):

```
  MCP: registered "aegis" in ~/my-project/.mcp.json
✓ Claude Code (project): 24 skills in ~/my-project/.claude/skills
```

It does two things: it copies the 24 skills into your assistant's skills folder, and it registers a read-only `aegis` MCP server in the assistant's own config file. The config file is backed up as `<file>.aegis.bak` first. Add `--no-mcp` if you only want the skills.

## 3. Check that it worked

```bash
npx aegis-skills list
```

You should see the version, `24 skills bundled`, and one line for each install Aegis recorded, with the platform, whether it is a user or project install, and the folder. You can also open the skills folder and look for folders such as `threat-hunting` and `exposure-validation`.

## 4. Use your first skill

Restart your assistant so it picks up the new skills, then ask it something that a skill covers. For example:

> Which Aegis skills cover MITRE ATT&CK, and what does each one do?

or, to run one of the workflows:

> Use the Aegis threat-hunting skill to plan a hunt for suspicious PowerShell on our Windows servers. I am authorised to assess these systems.

Every skill starts with a scope-and-authorization section: a defensive purpose, an assumption that you only use it on systems you own or are explicitly authorised to assess, and what it will not do. Expect the assistant to confirm scope with you before it suggests any check. Each skill is split into phases, and the assistant loads only the phase it needs.

Aegis is guidance. It does not run scans or touch your systems. You review every command your assistant suggests before you run it.

## 5. Keep it up to date

- `npx aegis-skills@latest update` re-syncs every recorded install with the newest version.
- After you upgrade the package, installed skills also refresh themselves the next time you run `aegis`. Set `AEGIS_NO_AUTO_REFRESH=1` to turn that off.
- A file you edited is saved as `<file>.bak` before it is replaced.

## 6. Remove it

```bash
npx aegis-skills uninstall --platform claude
```

Add `--project` to remove a project install. Uninstall removes only what Aegis installed and unregisters the MCP entry it added.

## Troubleshooting

- **`npx` waits on a prompt.** Add `-y`: `npx -y aegis-skills install --platform claude`.
- **"no supported tool found in your home folder".** Without `--platform`, the installer looks in your home folder for installed assistants and stops if it finds none. Name the platform yourself.
- **Wrong Node version.** `node --version` must print v24 or higher.
- **The assistant does not see the skills.** Restart it, and check that you installed into the folder it reads: see [where files go](./install.md#where-files-go).
- **A skill folder already exists.** Aegis skips folders it did not install. Re-run with `--force` to back up and replace it.
- **Not sure what is installed where.** Run `npx aegis-skills list`.

## Next

- [Single-file prompts](./single-file-prompts.md) for chat AIs that cannot read a skills folder.
- [MCP](./mcp.md) to run the same server locally, or [hosted MCP](./hosted-mcp.md) for nothing to install.
- [Skill format](./skill-format.md) if you want to read or write skills yourself.
