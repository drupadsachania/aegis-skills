# Configuration

## Home directory

Themis keeps its data in `~/.themis/`. Set `THEMIS_HOME` to use another folder. Nothing is purged automatically; delete the folder to remove it all.

| File | Used by | Holds |
|---|---|---|
| `themis.db` | both modes | Runs, the audit log and approvals. |
| `config.json` | standalone | Settings, model overrides, MCP servers, disabled skills. |
| `.env` | standalone | API keys saved from the dashboard or `themis keys set`. |
| `app.db` | standalone | Run checkpoints and saved reports. |

## External MCP servers

Servers are listed as a JSON array. Themis never offers external tools unless a server is listed here (see [Governance](./governance.md)).

```json
[
  {
    "id": "osint",
    "transport": "http",
    "url": "https://mcp.example.internal/osint",
    "allowedSkills": ["attack-surface-mapping", "threat-intel-synthesis"],
    "allowWrite": false
  }
]
```

| Field | Meaning |
|---|---|
| `id` | Lowercase letters, digits and hyphens, up to 64 characters, unique. Used in tool names as `themis__<id>__<tool>`. |
| `transport` | `http` (an http or https `url`) or `stdio` (a local `command`, with optional `args`). |
| `url` / `command`, `args` | Where to reach the server. A `stdio` server starts a local process on your machine. |
| `headers` | Optional map of string headers sent to an `http` server. |
| `allowedSkills` | Skills that may use the server. Empty means none; `["*"]` means every skill. |
| `allowWrite` | Default `false`. When `false`, the server's write and execute tools are not offered at all. |
| `maxCalls` | Read calls per run and skill. Default 5, maximum 20. |
| `timeoutMs` | Timeout per connection and call. Default 15000, maximum 30000. |

Entries that fail validation are dropped.

**Standalone:** the list is stored in `config.json` under `mcpServers`. Edit it on the dashboard's MCP servers page, or run `themis config set mcpServers '<json>'`.

**Plugin:** the plugin does not read `config.json`. Set the same JSON array in the `THEMIS_MCP_SERVERS` environment variable of the `themis` MCP server entry in your client's config (most clients support an `env` map on a server entry).

## Model keys (standalone)

| Provider | Variable |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GOOGLE_API_KEY` |
| Local (optional) | `THEMIS_LOCAL_API_KEY` |

An environment variable wins over the key file. Keys saved from the dashboard or `themis keys set <provider>` go to `~/.themis/.env`, which is created with mode `0600` on macOS and Linux (Windows does not enforce that mode, so keep your profile private). The dashboard only shows a masked key, and a key is used only to call the provider you chose.

## Local models

Set up the Local provider on the Models & Keys page, or in `config.json` under `local`: `preset` (`ollama`, `lmstudio` or `custom`), `baseURL` and `model`. The Ollama default is `http://127.0.0.1:11434/v1` and the LM Studio default is `http://127.0.0.1:1234/v1`. Any OpenAI-compatible base URL works. See [Themis standalone](./mode-2-app.md).
