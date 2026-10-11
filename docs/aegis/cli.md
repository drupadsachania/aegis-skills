# aegis CLI

The `aegis` command ships in the `aegis-skills` package. Run `aegis --help` to print the usage text below. `aegis --version` prints the package version (1.1.0).

## Commands

| Command | What it does |
|---|---|
| `aegis install` | Copy the skills into each tool's skills folder and register the MCP server. |
| `aegis init` | Alias of `install`. |
| `aegis uninstall` | Remove what Aegis installed. |
| `aegis update` | Re-sync every recorded install now. |
| `aegis list [--json]` | Bundled skills and recorded installs. |
| `aegis mcp` | Serve the skills over MCP on stdio. |

## Options

```
aegis install [--platform <id>[,<id>...]|all] [--project] [--dir <path>]
              [--no-mcp] [--mcp npx|local] [--force]
aegis uninstall [--platform <id>[,<id>...]] [--project] [--dir <path>]
```

| Option | Meaning |
|---|---|
| `--platform <id>[,<id>...]` | One or more of `claude`, `codex`, `gemini`, `cursor`, `vscode`, `antigravity`. For `install`, `all` selects every platform. Without it, `install` targets every platform found in your home folder. |
| `--project` | Install into the current folder instead of your user folder. For `uninstall`, remove a project install. |
| `--dir <path>` | The project folder to use with `--project` instead of the current folder. |
| `--no-mcp` | Do not register the MCP server. |
| `--mcp npx\|local` | How the registered MCP entry starts the server: `npx` (the default, survives upgrades) or `local` (pins the installed copy). |
| `--force` | Back up and replace an existing skill folder that Aegis did not install. |
| `--json` | With `list`, print the result as JSON. |

## Environment

- `AEGIS_NO_AUTO_REFRESH=1` turns off the automatic refresh of installed skills after an upgrade.
- `AEGIS_HOME` changes where Aegis keeps its install record (default `~/.aegis`).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success. |
| 1 | Failure, including `install` finding no supported tool in your home folder. |
| 2 | Bad usage: an unknown command, option or platform. |
