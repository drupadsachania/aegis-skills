# Runbook: Anthropic plugin directory (Aegis and Themis plugins)

Maintainer file, not product documentation. Copy and names come from [listing-copy.md](listing-copy.md).

Status as of 2026-10-13: nothing is submitted and nothing is listed. The Aegis plugin can be submitted once the site is deployed (blocker 3: inbound mail delivery verified 2026-10-13; the portal's verification email is still to come). The Themis plugin also waits for the Phase 7 npm publish, because its `.mcp.json` runs a published package.

## Sources (fetched 2026-10-12)

| Topic | URL |
|---|---|
| Submit a plugin (portal steps, limits, review, updates) | <https://www.claude.com/docs/plugins/submit> |
| Plugin pre-submission checklist (what validation and the scan check) | <https://claude.com/docs/plugins/pre-submission-checklist> |
| Software Directory Terms and Policy (linked from both pages above, not fetched) | <https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy> |
| Owner-supplied summary of the same rules (chat-assistant text, not an official source; used only where it matches the pages above) | `D:Downloadsanthropic_guidelines.txt`, read 2026-10-12 |

The submit page did not cover version pinning; the checklist does (see "Pins" below).

## Blockers (USER ACTION unless stated)

1. ~~Copyright and licence holder~~ **Decided 2026-10-12: Kairos Foundation.** `author.name` in both `plugin.json` files and `.claude-plugin/marketplace.json` `owner` agree. Nothing to do.
2. ~~Repository must be public~~ **Satisfied, per the owner's statement (2026-10-12).** This was not verified by the maintainer tooling.
3. **Verified contact and support channel (DONE: inbound delivery verified 2026-10-13).** The Anthropic rules list "a privacy policy link" and "verified contact and support channels" as developer duties, and the portal's compliance step asks for a contact email. Contact fields: support = `support@kairos-foundation.org`, privacy = `privacy@kairos-foundation.org`. Vulnerability reports stay on GitHub private vulnerability reporting (`SECURITY.md`), not email. **USER ACTION before submitting:** send a test message to both `support@kairos-foundation.org` and `privacy@kairos-foundation.org` from an outside account, confirm delivery, and confirm that replies work from your mail client. The addresses are aliases that deliver to the owner's mailbox; MX records point at GoDaddy mail (checked 2026-10-13) but delivery has not been tested. The portal may email a verification link to the contact address. For the verified-contact step make sure you can receive a verification email at `support@kairos-foundation.org`.
4. **Phase 7 publish** of `aegis-skills@1.1.0` and `@aegis-skills/themis-plugin@1.1.0`. Until they exist on npm, the Themis plugin's `.mcp.json` points at a package that cannot be fetched, and Themis must not be submitted.
5. **Vercel deploy** of the website, because the Aegis plugin's `.mcp.json` points at `https://aegis-skills.vercel.app/api/mcp` and the privacy policy link must resolve.
6. **Name check.** Search the directory for "aegis" and "themis". A name used by another organization blocks; a look-alike is held for a reviewer.
7. A paid Claude plan and a role that may submit, with your GitHub account connected on claude.ai (portal prerequisites).
8. **Terms of service URL.** The page is written (`docs/legal/terms.md`, rendered at `/terms`). Once the site is deployed, the URL to give is <https://aegis-skills.vercel.app/terms>. Have the text reviewed by a lawyer first and fill in the governing-law line (a visible placeholder sentence today).

## What the repository already satisfies

Checked against the pre-submission checklist on 2026-10-12. "Check" means verify in the portal's Validate report; nothing here has been run through the portal.

| Checklist item | State |
|---|---|
| Plugin folder contains `.claude-plugin/plugin.json` | `packages/aegis/.claude-plugin/plugin.json` and `packages/themis-plugin/.claude-plugin/plugin.json` exist |
| One plugin per submission | Submit `packages/aegis` and `packages/themis-plugin` separately; the portal does not accept the marketplace repo as one submission |
| `name` lowercase letters, digits, hyphens | `aegis`, `themis` |
| `description`, `author`, `version` set | Present in both |
| README of at least 40 words in the plugin folder | `packages/aegis/README.md` and `packages/themis-plugin/README.md`, each with a "What this plugin runs, sends and fetches" section (checked by `scripts/check-plugin-bundle.js`) |
| LICENSE file in each plugin folder | `LICENSE`, `LICENSE-MIT`, `LICENSE-APACHE` in both (Themis copies added 2026-10-12; Kairos Foundation in all) |
| Files: 512 or fewer, each non-image file under 256 KiB, text only | Aegis has 245 tracked files, none over 256 KiB (checked with `git ls-files`); Themis has 33 tracked files. Check the report for `health.json` and the skill `intel-state.json` files being listed |
| Remote MCP server has `type` and an `https://` url | `packages/aegis/.mcp.json` uses `type: http` and the hosted URL |
| Package launchers pinned to an exact version | `packages/themis-plugin/.mcp.json` pins `@aegis-skills/themis-plugin@1.1.0` and `aegis-skills@1.1.0` |
| No `.npmrc`, `bunfig.toml`, `uv.toml` in a plugin that uses a launcher | None present in either plugin folder; `check-plugin-bundle.js` fails if one appears |
| Valid YAML front matter, exact `skills/` and `SKILL.md` names, ASCII names, no reserved words, no paths outside the folder | Checked by `scripts/check-plugin-bundle.js` (part of `npm run check:deps`) |
| No real credentials in files | None; the plugins need none |
| Readable source, not minified or compiled | Themis plugin ships TypeScript source and builds `dist/` at publish time; `dist/` is not committed |

### Local validation results

`claude plugin validate` (the installed `claude` CLI, run 2026-10-12 from the repository root):

| Command | Output |
|---|---|
| `claude plugin validate ./packages/aegis` | Validation passed |
| `claude plugin validate ./packages/themis-plugin` | Validation passed |
| `claude plugin validate .` (the marketplace file) | Validation passed |

The portal's Validate step is stricter; its report is the authority.

### Rules from the uploaded guidelines and how the repository meets them

| Rule | State |
|---|---|
| Tool descriptions state what a tool does and do not tell Claude how to behave or to call other tools (an "attack surface") | The three Aegis tool descriptions in `packages/aegis/mcp/server.js` were reviewed on 2026-10-12. `get_skill_phase` said "Pass the phase id from get_skill"; that is reworded to describe the argument only, and the server instructions and the unknown-skill error no longer tell the model to call another tool. Tests stay green |
| Tool names 64 characters or fewer; separate read and write tools | Names are 10 to 15 characters; all tools are read-only, so there are no write tools to split |
| Security scan: the README and source must disclose everything the plugin runs, sends or fetches | Both READMEs have a "What this plugin runs, sends and fetches" section written from the code: the hosted URL, pinned `npx` packages, the local store path, the gateway contacting only user-configured MCP servers, no telemetry |
| At least 3 working example prompts | `listing-copy.md` lists four for Aegis and three for Themis; Aegis ones have verified expected results in `docs/themis/test-prompts.md` |
| Privacy policy link | `/docs/themis/privacy-policy` once deployed |
| Raise `version` in `plugin.json` for every release | Phase 7's version script |
| `claude plugin eval` (with and without the plugin) | Not run; it is described as the quality test and is optional here |

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
6. **Compliance.** Enter `support@kairos-foundation.org` as the contact email (the portal may send a verification link there) and tick the four acknowledgements.
7. **Review and submit.** Choose how new versions arrive: GitHub push webhook (default, needs repository admin) or scheduled check. Submit.
8. After a pass, **Publish** (a reviewer publishes by default). If `plugin.json` sets `version`, increase it for every release.

Limits to remember: 10 submissions per organization per 24 hours, drafts and withdrawals included; one submission per repository and folder.

## Submit the hosted server as a connector too

The connector page recommends submitting a remote MCP server that a plugin points at as a connector as well. See [anthropic-connectors.md](anthropic-connectors.md).

## After submission

Scans run on every new commit on the tracked branch. A first submission that fails the security scan is rejected. Feedback appears in the portal. Escalations for connectors go to `mcp-review@anthropic.com` (stated on the connector page).
