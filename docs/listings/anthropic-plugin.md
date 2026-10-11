# Runbook: Anthropic plugin directory (Aegis and Themis plugins)

Maintainer file, not product documentation. Copy and names come from [listing-copy.md](listing-copy.md).

Status as of 2026-10-12: nothing is submitted and nothing is listed. The Aegis plugin can be submitted once the repository is public and the site is deployed. The Themis plugin waits for the Phase 7 npm publish, because its `.mcp.json` runs a published package.

## Sources (fetched 2026-10-12)

| Topic | URL |
|---|---|
| Submit a plugin (portal steps, limits, review, updates) | <https://www.claude.com/docs/plugins/submit> |
| Plugin pre-submission checklist (what validation and the scan check) | <https://claude.com/docs/plugins/pre-submission-checklist> |
| Software Directory Terms and Policy (linked from both pages above, not fetched) | <https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy> |

The submit page did not cover version pinning; the checklist does (see "Pins" below).

## Blockers (USER ACTION unless stated)

1. **Copyright and licence holder is undecided** (Kairos Foundation or Drupad Sachania). The portal's compliance step needs a contact and acknowledgements, and `author.name` in both `plugin.json` files says Kairos Foundation while `.claude-plugin/marketplace.json` `owner` says Drupad Sachania. Decide, then make them agree.
2. **Repository must be public** before the listing goes live (it may be private during validation if the Claude GitHub App is installed and you accept the source being uploaded to Anthropic for scanning).
3. **Phase 7 publish** of `aegis-skills@1.1.0` and `@aegis-skills/themis-plugin@1.1.0`. Until they exist on npm, the Themis plugin's `.mcp.json` points at a package that cannot be fetched, and Themis must not be submitted.
4. **Vercel deploy** of the website, because the Aegis plugin's `.mcp.json` points at `https://aegis-skills.vercel.app/api/mcp`.
5. **Name check.** Search the directory for "aegis" and "themis". A name used by another organization blocks; a look-alike is held for a reviewer.
6. **Security contact email** in `SECURITY.md` and **privacy contact email** in `docs/themis/privacy-policy.md` are placeholders.
7. A paid Claude plan and a role that may submit, with your GitHub account connected on claude.ai (portal prerequisites).

## What the repository already satisfies

Checked against the pre-submission checklist on 2026-10-12. "Check" means verify in the portal's Validate report; nothing here has been run through the portal.

| Checklist item | State |
|---|---|
| Plugin folder contains `.claude-plugin/plugin.json` | `packages/aegis/.claude-plugin/plugin.json` and `packages/themis-plugin/.claude-plugin/plugin.json` exist |
| One plugin per submission | Submit `packages/aegis` and `packages/themis-plugin` separately; the portal does not accept the marketplace repo as one submission |
| `name` lowercase letters, digits, hyphens | `aegis`, `themis` |
| `description`, `author`, `version` set | Present in both |
| README of at least 40 words in the plugin folder | `packages/aegis/README.md` (141 words), `packages/themis-plugin/README.md` (273 words) |
| LICENSE file or `license` in `plugin.json` | Aegis has LICENSE files; Themis sets `license` in `plugin.json` |
| Files: 512 or fewer, each non-image file under 256 KiB, text only | Aegis has 245 tracked files, none over 256 KiB (checked with `git ls-files`); Themis has 33 tracked files. Check the report for `health.json` and the skill `intel-state.json` files being listed |
| Remote MCP server has `type` and an `https://` url | `packages/aegis/.mcp.json` uses `type: http` and the hosted URL |
| Package launchers pinned to an exact version | `packages/themis-plugin/.mcp.json` pins `@aegis-skills/themis-plugin@1.1.0` and `aegis-skills@1.1.0` |
| No `.npmrc`, `bunfig.toml`, `uv.toml` in a plugin that uses a launcher | None present in either plugin folder (re-check before submitting) |
| No real credentials in files | None; the plugins need none |
| Readable source, not minified or compiled | Themis plugin ships TypeScript source and builds `dist/` at publish time; `dist/` is not committed |

### Pins

The checklist says every package a launcher runs must be pinned to an exact version, for example `npx <package>@1.2.3`, not a range or `@latest`, and that an unpinned `npx` launcher blocks. Both `.mcp.json` pins are exact today. A pinned `npx` package is still held for a reviewer ("Runs a pinned npx or uvx package"), because the package's own dependencies resolve at install time. Expect a human review for the Themis plugin. Phase 7's version script rewrites the pins when versions change; do not hand-edit them.

### Likely reviewer holds

- Themis runs a pinned npm package: held, expected.
- Themis ships agents and a skill that route all external tool use through `themis_external_*`; describe that in the README (the security scan looks for behaviour that is not disclosed).
- `packages/aegis` contains a `package.json` and no lockfile, so the lockfile-install hold should not apply. Verify in the report.

## Steps

1. Run the local check from the folder that contains the plugin folder: `claude plugin validate ./packages/aegis`, then `./packages/themis-plugin`. It only checks syntax and schema.
2. Open <https://claude.ai/directory/manage>, select **Submit new**, then **Plugin bundle**.
3. **Source.** Repository `drupadsachania/aegis-skills`, plugin path `packages/aegis` (second submission: `packages/themis-plugin`). Leave the branch empty to follow the default branch, or enter a release tag. Select **Validate**. A result applies to one commit, so push fixes and re-validate.
4. **Listing details.** The name and description come from `plugin.json` and the README. Change them in the repository, not in the portal.
5. **Data handling.** Answer from `docs/themis/privacy-policy.md`: the Aegis plugin reads no personal data and stores nothing; the hosted MCP server keeps only an in-memory request counter. Themis stores run state, approvals and an audit log locally under `~/.themis/` and sends nothing elsewhere except to MCP servers the user connects. Neither plugin targets people under 18.
6. **Compliance.** Confirm a contact email and tick the four acknowledgements.
7. **Review and submit.** Choose how new versions arrive: GitHub push webhook (default, needs repository admin) or scheduled check. Submit.
8. After a pass, **Publish** (a reviewer publishes by default). If `plugin.json` sets `version`, increase it for every release.

Limits to remember: 10 submissions per organization per 24 hours, drafts and withdrawals included; one submission per repository and folder.

## Submit the hosted server as a connector too

The connector page recommends submitting a remote MCP server that a plugin points at as a connector as well. See [anthropic-connectors.md](anthropic-connectors.md).

## After submission

Scans run on every new commit on the tracked branch. A first submission that fails the security scan is rejected. Feedback appears in the portal. Escalations for connectors go to `mcp-review@anthropic.com` (stated on the connector page).
