# Themis standalone (mode 2)

Themis standalone is the `@aegis-skills/themis` package: a local web dashboard plus a headless CLI that run the Themis workflow on your machine with a model you choose. It uses the same Aegis skills, the same governed tool gateway and the same approval rules as the plugin mode, but you do not need an AI assistant host.

This guide covers install, every dashboard page, local models, tool-calling behaviour and troubleshooting. The package README has the command reference and the security model.

## Install on a clean machine

You need only Node.js 24 or newer. No compiler or build tools are required.

1. Check the version: `node -v` prints `v24.x` or higher.
2. Start the dashboard:
   ```bash
   npx @aegis-skills/themis dashboard
   ```
   Until the packages are published, install the four tarballs together instead (all in one command) and run `npx themis dashboard`:
   ```bash
   npm init -y
   npm install ./aegis-skills-*.tgz ./aegis-skills-themis-core-*.tgz ./aegis-skills-themis-gateway-*.tgz ./aegis-skills-themis-0*.tgz
   npx themis --version
   ```
   `--version` prints `themis 0.1.0 (Aegis ..., osk ...)` with no warning line.
3. Your browser opens the dashboard. If it does not, open the printed `Dashboard:` link. The link holds a one-launch session token; do not share it.
4. Add a model (see **Models & Keys** below), then use **Run**.

Command-line only:

```bash
npx themis run "Review the security baseline of a small Linux web server running nginx and SSH"
```

The Markdown report goes to stdout, progress to stderr. Exit code `3` means the run paused for an approval: start `themis dashboard`, decide on the Approvals page, and the run resumes.

## Dashboard pages

### Run

Choose a mode with the buttons at the top. Every form shows: "Requires authorization: use only on systems you own or are authorized to assess."

- **Themis task**: describe the task (up to 4000 characters), optionally pick a provider (otherwise the default), and add environments and tags (comma-separated). Start shows a live timeline of steps and sub-tasks. When a run needs an approval it shows a warning with a link to Approvals. When it completes the report appears below, with links to the saved report and its Markdown/JSON exports.
- **Compliance audit**: paste a configuration, policy or description (up to 12000 characters), choose the input type and standards (CIS L1/L2, NIST CSF, ISO 27001, SOC 2, PCI DSS, HIPAA, IEC 62443, NIST 800-53), and optionally a system type and environments. You get the executive summary, a findings table (severity, control, title, recommendation) and a saved report.
- **Exposure validation**: paste the exposure description and optionally a CVE, KEV and EPSS details, the authorization checkboxes (authorized, scope confirmed, target identity verified, maintenance window), an approver, asset id, business criticality and crown-jewel flag. The result shows the workflow state, risk before and after, the executive summary and a saved report.

If no provider is configured the page tells you and links to Models & Keys.

### Sessions

A list of runs (short id, task, status, current step, pending approvals, last update). Open one to see its status, error (if any), version stamp, sub-tasks (skill, phase, dependencies), results (confidence and guardrail verdict, with findings in a collapsible block), its approvals and its audit events.

**Resume** appears when a run has failed, when it is awaiting approval with nothing pending, or when it is marked running but no worker is active (for example after a crash). Resuming continues from the last checkpoint.

### Findings & Reports

Every report (Themis, audit, exposure) is saved here with a stamp such as `Themis 0.1.0 · Aegis 1.1.0 (osk 1.x)`. Filter by kind, open a report to read it, and download it as Markdown or JSON. Reports are shown as plain text.

### Approvals

Pending proposals show the run, `server/tool`, whether it is a write or execute action, the reason, the redacted arguments and when it was proposed. **Approve** asks for a confirmation and then runs the action through the gateway. **Reject** records the refusal. Once nothing is pending for a paused run, it resumes automatically ("Run resumed").

If Themis restarted after the action was proposed and its arguments contained secrets, a warning explains that approving records your decision but the action cannot run and must be proposed again. The decided list shows each decision and its execution outcome: `executed`, `not_executed`, `needs_reproposal`, `failed` or `not_run`. The page refreshes every 5 seconds. Nothing runs without a click.

### Skills

The bundled Aegis skills with description, phase count and "intel as of" date (marked `stale` if older than 30 days or unknown). Untick a skill to disable it: disabled skills are not offered to the planner or to sub-agents.

### MCP servers

External tool servers that sub-agents may use, always through the gateway. The table lists id, transport, URL or command, allowed skills, `allowWrite`, `maxCalls` and `timeoutMs`. Edit the JSON list and Save (invalid entries are dropped and the count is shown). Header values appear masked; leaving a masked value unchanged keeps the stored secret. **Test** lists a server's tools with their class and disposition without calling any of them.

Two things to know: `stdio` servers start a local command on this machine, and servers with `allowWrite` let sub-agents *propose* write or execute actions, each of which waits for your approval.

Example (macOS/Linux):

```json
[{"id":"everything","transport":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-everything"],"allowedSkills":["*"],"allowWrite":true}]
```

On Windows use `"command":"npx.cmd"`, or the full path to `npx.cmd`.

### Models & Keys

Pick the **default provider**. Each cloud card (Anthropic, OpenAI, Google Gemini) shows the key status and where it comes from (`from environment` disables editing), the masked key, a link to get a key, and:

- an API key box (cleared after saving; the key is never shown again), **Save key** and **Remove**;
- **Test**, which reports success with latency and model, or the error;
- per-tier model overrides (fast, standard, power).

The **Local** card has a preset (Ollama, LM Studio or Custom), a base URL, a model name (suggestions appear after a test), an optional key, Save and Test, and shows the tool-calling status (`supported`, `unsupported` or `unknown`).

You can also manage keys from the terminal: `themis keys set <provider>`, `themis keys list`, `themis keys test <provider>`.

### Settings

Read-only data locations (home folder, `config.json`, `.env`, `themis.db`, `app.db`) and a note on how the key file is protected (mode 0600 on macOS/Linux; inherited user-profile permissions on Windows). You can change the maximum concurrent runs (1-4) and the dashboard port (1024-65535, applies at the next launch), and see the version stamp.

## Local models (Ollama and LM Studio)

1. **Ollama**: install it, run `ollama pull llama3.1:8b` (or another tool-capable model). It listens on `http://127.0.0.1:11434`. **LM Studio**: load a model and start its local server on port 1234.
2. In **Models & Keys**, on the Local card choose the matching preset, enter the model name and Save.
3. Click **Test**. A pass shows the latency and the tool-calling result.
4. Set **Default provider** to Local and start a run.

### Tool-calling behaviour

The Test button probes whether the model can call tools and stores the result.

- `supported`: sub-agents run with tools, including your MCP servers.
- `unsupported` or `unknown`: sub-agents run in no-tools mode. The skill phase and earlier findings are placed in the prompt and no external MCP tools are offered.
- If a model rejects tools at run time, that sub-task is retried once in no-tools mode.

Cloud providers always run with tools. Small local models sometimes return malformed JSON during planning; Themis retries once, then fails the run with a clear message. You can change the model and Resume.

## Troubleshooting

- **Port in use.** Pass another port: `themis dashboard --port 9200` (or `themis config set dashboard.port 9200`).
- **"Dashboard UI is not built".** Only seen when running from a git checkout. Build it with `npm run build -w @aegis-skills/themis`. The published package ships the built UI.
- **`ExperimentalWarning: SQLite is an experimental feature`.** Themis suppresses it on Node 24. If you see it, check which Node you are running with `node -v`; Themis requires Node 24 or newer and refuses older versions.
- **A provider test fails.** Read the error on the card. Check the key (or `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` in the environment, which override the key file), the model name, and for Local that the server is running and the base URL ends in `/v1`.
- **A stdio MCP server is not found on Windows.** Use `npx.cmd` as the command, or its full path.
- **The dashboard shows "Not authenticated".** Open the `Dashboard:` link printed by the current launch; the token changes every time Themis starts.
- **A run is stuck as "running" after a crash.** Open the session and press Resume.
