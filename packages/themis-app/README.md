# @aegis-skills/themis

Themis is a local security-operations agent. It runs on your machine, plans a task with the bundled Aegis skill pack, runs the skills as sub-agents on the model you choose, and writes a version-stamped report. You drive it from a web dashboard on `127.0.0.1` or from the command line. Every external tool call goes through a governed gateway, and anything that writes or executes waits for your explicit approval.

## Requirements

- Node.js 24 or newer.
- No compiler, Python or build tools. There are no native modules (the app uses the built-in `node:sqlite`).
- A model: your own API key (Anthropic, OpenAI or Google Gemini) or a local OpenAI-compatible server (Ollama, LM Studio).

## Quick start

```bash
npx @aegis-skills/themis dashboard
```

The command prints a `Dashboard:` link that carries a session token for this launch and opens it in your browser. Open **Models & Keys**, add a key (or point the Local card at Ollama or LM Studio), pick a default provider, then use **Run**.

## Commands

```
themis - local security-operations agent (Themis + the Aegis skill pack)

Usage:
  themis dashboard [--port 9120] [--host 127.0.0.1] [--allow-host <name>] [--no-open]
  themis run "<task>" [--provider anthropic|openai|google|local] [--env a,b] [--tags x,y] [--json]
  themis config get [key]
  themis config set <key> <value>
  themis keys [list]
  themis keys set <provider> [--stdin]
  themis keys unset <provider>
  themis keys test <provider>
  themis --version | --help

Data lives in ~/.themis (override with THEMIS_HOME).
```

Notes:

- `themis run` prints the Markdown report on stdout (`--json` prints the structured body instead) and progress on stderr. Exit codes: `0` completed, `1` failed, `2` bad usage, `3` paused for approval (open the dashboard, decide, and the run resumes).
- `themis keys set <provider>` reads the key without echo; use `--stdin` to pipe it.
- `themis config get/set` use dotted keys such as `defaultProvider`, `limits.maxConcurrentRuns` or `dashboard.port`. Values are parsed as JSON when possible.
- `--host` other than a loopback address prints a warning; `--allow-host` adds an extra accepted `Host` name.

## Providers

| Provider | Id | Key environment variable |
|---|---|---|
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Google Gemini | `google` | `GOOGLE_API_KEY` |
| Local (OpenAI-compatible) | `local` | `THEMIS_LOCAL_API_KEY` (optional) |

An environment variable wins over the key file. Default models per tier (override in `config.json` under `models`, or on the Models & Keys page):

| Provider | fast | standard | power |
|---|---|---|---|
| anthropic | `claude-haiku-4-5-20251001` | `claude-sonnet-5-5` | `claude-opus-5-5` |
| openai | `gpt-4o-mini` | `gpt-4o` | `gpt-5.5-pro` |
| google | `gemini-2.0-flash` | `gemini-2.5-pro` | `gemini-3.1-pro` |

Local presets (one model is used for every tier):

- Ollama: `http://127.0.0.1:11434/v1`
- LM Studio: `http://127.0.0.1:1234/v1`
- Custom: any OpenAI-compatible base URL.

The local card's **Test** button checks whether the model supports tool calling. Without it, sub-agents run without tools and external MCP tools are disabled.

## Security model

- The server binds `127.0.0.1` by default. A non-loopback `--host` needs to be explicit and prints a warning; traffic is plain HTTP.
- Each launch generates a 256-bit token. The printed link exchanges it for an `HttpOnly; SameSite=Strict` cookie (`themis_session_<port>`) and then redirects to a clean URL.
- Every request (page and API) needs that cookie, after an exact `Host` allowlist check.
- State-changing requests also need a same-origin `Origin` header (and `Sec-Fetch-Site: same-origin` when the browser sends it). JSON bodies only, at most 64 KiB.
- No CORS headers are ever sent; `OPTIONS` is refused.
- Content-Security-Policy: the UI is served with a strict policy (scripts, styles and connections from `self` only); the API with `default-src 'none'`.
- API keys are never returned in full; the dashboard shows a masked value. The key file `~/.themis/.env` is created with mode `0600` on macOS and Linux. On Windows that mode is not enforced: the file inherits your user-profile permissions, so keep your profile private or use environment variables.

## Approvals

Nothing that writes or executes runs without your click. When a sub-agent proposes such an action, the run pauses and the proposal appears under **Approvals** with its (redacted) arguments. Approve runs it through the gateway; Reject records the refusal. Once every pending approval is decided, the run resumes.

If Themis restarts between the proposal and your decision, the raw arguments are gone from memory. When the stored arguments contained secrets, the dashboard warns you up front: approving only records your decision, and the action ends as `needs_reproposal`. Nothing is ever executed from redacted values. Approvals do not expire.

## Data

Everything lives in `~/.themis` (set `THEMIS_HOME` to move it):

- `config.json` - settings, model overrides, MCP servers, disabled skills.
- `.env` - API keys saved from the dashboard or `themis keys set`.
- `themis.db` - runs, audit log and approvals.
- `app.db` - run checkpoints (so runs survive restarts) and reports.

Nothing is retained or purged automatically. Delete the folder to remove it all.

## Licence

`Apache-2.0 OR MIT`
