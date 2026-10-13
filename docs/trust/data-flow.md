# Trust and data flow

This page says, path by path, what runs where, which outside services each path contacts, what is stored and what leaves your machine. Every claim names the file that backs it, and the checklist near the end shows how to confirm it yourself rather than take our word for it.

Status: nothing is published to npm or to a plugin directory yet. Aegis publishes first, so its paths are marked "after the first release". Themis is in development and local-first; its paths are marked "in development" and it is not published to npm or AI directories yet. The website, the hosted MCP and the downloads work today.

## At a glance

| Path | Runs on | Outside services it contacts | Stored locally | Leaves your machine |
|---|---|---|---|---|
| Zero install (copy a prompt, upload a zip) | Nothing of ours; your chat AI | The AI service you paste into | Nothing | Whatever you paste into your chat AI |
| Hosted MCP | A read-only function on our Vercel deployment | None from our side; your AI client calls our endpoint | Nothing | The tool name and arguments your AI client sends us |
| Skill pack through the CLI (after the first release) | Your machine | npm, once, to download the package | Skill files and an install ledger | Nothing |
| Themis plugin (in development) | Your machine, inside your AI client | Your AI client's own provider; only the MCP servers you configured | `~/.themis/themis.db` | What your AI client sends to its provider; arguments to your MCP servers |
| Themis standalone (in development) | Your machine, dashboard on 127.0.0.1 | The model provider you chose, or a local model; only the MCP servers you configured | `~/.themis/` | Task text and context to your model provider; arguments to your MCP servers |
| This website | Your browser | Our own origin and Adobe Fonts (see Web fonts) | Your theme choice | Page requests |

## No hosted inference

The website, the hosted MCP and the downloads never call a model. They hold no model keys, and a test fails if the site declares or imports a model package, reads secrets from the environment or brings back a removed route. The only model that ever sees your data is the one you bring: your chat AI, your AI client, or the provider or local model you configure in the standalone app. See [the website guard test](../../apps/web/tests/guard/no-model-deps.test.js).

## Zero install

- **Runs:** nothing of ours. The site serves static files: single-file prompts and skill zips built at deploy time into `/downloads` ([build script](../../apps/web/scripts/build-downloads.js)).
- **Contacts:** your browser downloads the file from our site. You then paste or upload it into the chat AI you chose, and that AI's provider receives it with the rest of your chat.
- **We never see what you paste or ask.** Nothing on the site sends your prompts anywhere.

## Hosted MCP

- **Runs:** one route on our Vercel deployment, `/api/mcp` ([route](../../apps/web/app/api/mcp/route.ts)), serving the same server code as the local one ([server](../../packages/aegis/mcp/server.js)).
- **Tools:** three, `list_skills`, `get_skill` and `get_skill_phase`. All three are annotated read-only and return public skill text that is also on the website.
- **What we receive:** the MCP request: the tool name and its arguments (a skill name, a phase, a search text of at most 200 characters), plus the network metadata any web server sees.
- **State:** none per request. A fresh server object handles each request and is closed afterwards. The only memory is a request counter in the running instance (120 requests a minute per IP address) that is never written to disk or logged ([rate limit](../../apps/web/lib/rate-limit.ts)). Bodies over 64 KB are rejected and responses are `no-store`.
- **Outside services:** the server code makes no outbound network calls. Our hosting platform keeps its own standard request logs (IP address, time, path) under its own retention; our code does not read or export them.
- **Please do not** put personal data or secrets into tool arguments. The tools do not need them.

## Skill pack through the CLI

- **Runs on your machine:** `npx aegis-skills install --platform <id>` copies markdown skill files into your assistant's skills folder and records what it wrote, with a SHA-256 for each file, in `~/.aegis/installed.json` (`AEGIS_HOME` overrides it) ([ledger](../../packages/aegis/lib/ledger.js)).
- **Contacts:** npm, once, when `npx` downloads the package. The package's code (`cli`, `lib`, `mcp`) contains no network calls, so nothing contacts any service afterwards. The local `aegis mcp` server speaks stdio only.
- Once installed, the skills are text files. What leaves your machine is whatever your assistant then sends to its own provider.

## Themis plugin (on your AI)

- **Runs:** a local stdio MCP server, `@aegis-skills/themis-plugin`, started by your AI client with `npx`, next to the read-only `aegis` server. Your AI client does all the reasoning, so no API key is needed and Themis makes no model calls: its packages depend on no model SDK ([manifest](../../packages/themis-plugin/package.json)).
- **Contacts:** your AI client keeps talking to its own provider, as it always does. Themis itself contacts only the MCP servers you list in `THEMIS_MCP_SERVERS`. With none configured it makes no outbound connection. Stdio servers you configure start as local processes ([plugin README](../../packages/themis-plugin/README.md)).
- **Approvals:** a write or execute call becomes an approval request. You answer it in your client's own MCP prompt. If your client does not support that prompt, Themis does not run the action; it hands it back to you ([tools](../../packages/themis-plugin/src/tools/gateway-tools.ts)).
- **Stored:** runs, approvals and the audit log in `~/.themis/themis.db`.

## Themis standalone

- **Runs:** `themis dashboard`, a Node server on `127.0.0.1` (default port 9120). It accepts only allow-listed `Host` values (loopback by default), a session token cookie and a matching `Origin`, and its page policy is `default-src 'self'` with `connect-src 'self'` ([security](../../packages/themis-app/src/server/security.ts)). Binding any other address needs an explicit `--host` and prints a warning.
- **Model:** the provider you choose (Anthropic, OpenAI or Google) or a local model behind an OpenAI-compatible URL (default `http://127.0.0.1:11434/v1`). Only one file imports the provider libraries ([models](../../packages/themis-app/src/providers/models.ts)).
- **What the provider receives:** the prompts the workflow builds: your task text, sub-task context, Aegis skill text and tool output after redaction. Redaction is pattern based, so avoid putting secrets in task text.
- **Test connection:** the button on Models & Keys sends one tiny request to the provider, or probes your local server ([source](../../packages/themis-app/src/providers/test-connection.ts)). It is the only direct `fetch` in the app.
- **MCP servers:** only the ones you configure. Their output is redacted, cut at 4000 characters and wrapped as untrusted data before use.
- **Approvals:** decided on the dashboard's Approvals page ([route](../../packages/themis-app/src/server/routes/approvals.ts)).

## This website

- **Your browser** loads pages, scripts and styles from our own origin. The page policy sets `default-src 'self'`, `connect-src 'self'` and `img-src 'self' data:`, so the browser itself refuses other hosts, apart from Adobe Fonts below ([config](../../apps/web/next.config.js)).
- **Web fonts:** the site loads web fonts from Adobe Fonts (use.typekit.net and p.typekit.net). Adobe can see your IP address, your browser's user agent and the address of our site as part of serving the fonts and counting kit usage; our referrer policy (`strict-origin-when-cross-origin`) means the full address of the page you are on is not sent. The monospace face (Red Hat Mono) is self-hosted from our own origin. Nothing else third-party is loaded by the site ([page policy](../../apps/web/next.config.js), [font notes](../design/FONTS.md)).
- **Cookies:** none. The only thing stored in your browser is your light or dark choice, under `aegis-theme` in local storage.
- **Links** to GitHub and other sites open only when you click them.

## Telemetry

None. No analytics, tracking or crash-reporting code exists in the website, the hosted MCP, the CLI, the Themis packages or the dashboard, and the guard tests fail if the site's telemetry module comes back. The standalone app is built on LangChain libraries, whose optional LangSmith tracing turns on only if you set `LANGSMITH_TRACING` or `LANGCHAIN_TRACING_V2` yourself. Themis never sets them; leave them unset.

## Credentials

- **Plugin, hosted MCP and website:** none. There is no account, token or API key involved.
- **Standalone provider keys:** saved in `~/.themis/.env` (`THEMIS_HOME` overrides the folder). The folder is created with mode 0700 and the file is written through a temporary file with mode 0600 on macOS and Linux; Windows ignores those modes, so rely on your user profile's permissions there ([config](../../packages/themis-app/src/config/config.ts)). A key can also come from the environment (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `THEMIS_LOCAL_API_KEY`), and the environment wins ([keys](../../packages/themis-app/src/config/keys.ts)).
- **Never returned in full:** the dashboard API shows a saved key only as its first three and last four characters, and keys of eight characters or fewer as `••••`. Saving a key returns only that masked status ([models route](../../packages/themis-app/src/server/routes/models.ts)). Header values of your MCP servers are returned as `••••` too and are stored in `config.json`, not `.env`.
- **Where keys go:** only to the endpoint of the provider they belong to.

## What is stored locally

```
~/.themis/                  mode 0700 on macOS and Linux; THEMIS_HOME overrides
  themis.db                 runs, approvals, audit log (plugin and standalone)
  app.db                    standalone only: reports and workflow checkpoints
  config.json               standalone settings, model ids, MCP servers, port
  .env                      standalone provider keys, mode 0600
~/.aegis/installed.json     CLI install ledger
```

Delete the folders and everything the software stored is gone. We hold no copy.

## What leaves your machine

- Hosted MCP: the tool name and arguments you send us.
- Plugin: what your AI client sends to its provider, and arguments to MCP servers you configured.
- Standalone: prompts to the model provider you chose (nothing leaves the machine with a local model on your own computer), and arguments to MCP servers you configured.
- Nothing else, and nothing to us from the plugin, the CLI or the standalone app.

## Limits you should know

- Your AI client, its provider and any MCP server you add are outside Themis. They see what you send them.
- Redaction removes common secret patterns and email addresses. It is not a guarantee.
- In plugin mode, tools you connect straight to your assistant bypass Themis: they are not budgeted, approved or audited.
- A tool counts as read-only only if its server says so and nothing in its name or description suggests a write. An unmarked tool is treated as a write. A server that wrongly marks a write tool read-only is trusted for that call.
- The hosting platform's request logs follow its own retention rules.

## How to verify this yourself

1. Open your browser's network inspector on any page, reload with the cache off, and read the list of hosts. Compare it with the page policy in the response headers.
2. Run the guard tests: `npx jest apps/web/tests/guard` (no model packages, no environment reads, no removed routes).
3. Run the approval tests: `npx jest packages/themis-gateway packages/themis-plugin packages/themis-app/__tests__/server/approvals.test.ts`.
4. Run `npm run check:deps`, which fails if any code other than the two human channels can decide an approval.
5. Search the source: `grep -rn "fetch(" packages/themis-app/src` finds only the test-connection file, and the CLI and MCP server folders in `packages/aegis` contain no network code.
6. In the standalone app, save a key on Models & Keys and confirm it appears only as `abc…wxyz`; check `~/.themis` modes with `ls -l`.
7. With a local model and no MCP servers, watch your machine's connections while the app runs a task: only loopback should appear.

## Sources in the repo

- Website: [next.config.js](../../apps/web/next.config.js), [_document.js](../../apps/web/pages/_document.js), [no-model-deps guard](../../apps/web/tests/guard/no-model-deps.test.js), [privacy policy](../themis/privacy-policy.md)
- Hosted MCP: [route.ts](../../apps/web/app/api/mcp/route.ts), [rate-limit.ts](../../apps/web/lib/rate-limit.ts), [server.js](../../packages/aegis/mcp/server.js)
- CLI: [ledger.js](../../packages/aegis/lib/ledger.js)
- Approvals: [approvals.ts](../../packages/themis-core/src/approvals.ts), [gateway.ts](../../packages/themis-gateway/src/gateway.ts), [approval.ts](../../packages/themis-plugin/src/approval.ts), [dashboard route](../../packages/themis-app/src/server/routes/approvals.ts), [governance](../themis/governance.md)
- Tool classes: [tool-policy.ts](../../packages/themis-core/src/mcp/tool-policy.ts)
- Version stamp: [version.ts](../../packages/themis-core/src/version.ts), [versions](../themis/versions.md)
- Storage and keys: [home.ts](../../packages/themis-core/src/store/home.ts), [config.ts](../../packages/themis-app/src/config/config.ts), [keys.ts](../../packages/themis-app/src/config/keys.ts), [env-file.ts](../../packages/themis-app/src/config/env-file.ts), [models route](../../packages/themis-app/src/server/routes/models.ts)
- Standalone network: [models.ts](../../packages/themis-app/src/providers/models.ts), [test-connection.ts](../../packages/themis-app/src/providers/test-connection.ts), [security.ts](../../packages/themis-app/src/server/security.ts)
- Plugin: [README](../../packages/themis-plugin/README.md), [gateway-tools.ts](../../packages/themis-plugin/src/tools/gateway-tools.ts)
