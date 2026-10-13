# Directory listings: index, status and owner blockers

Maintainer folder, not product documentation and not on the public site. Status as of 2026-10-13. Nothing is submitted and nothing is listed anywhere.

## Status

| Runbook | Directory | Product | Plan | Status |
|---|---|---|---|---|
| [anthropic-plugin.md](anthropic-plugin.md) | Anthropic plugin directory | Aegis, Themis | Two plugin bundles (`packages/aegis`, `packages/themis-plugin`). `claude plugin validate` passes for both and `scripts/check-plugin-bundle.js` passes | Ready except the owner blockers below; Themis also needs the npm publish |
| [anthropic-connectors.md](anthropic-connectors.md) | Anthropic connectors directory | Hosted Aegis MCP | One read-only connector | Needs the site deployed |
| [chatgpt-app.md](chatgpt-app.md) | OpenAI Plugins Directory (ChatGPT and Codex) | Aegis | Skills-only plugin ZIP, no MCP, no demo video. Themis on ChatGPT deferred | Waits for the Phase 7 ZIP script, publisher verification and the mailbox delivery test |
| [gemini-gallery.md](gemini-gallery.md) | Gemini CLI extensions gallery | Aegis | Release archive with the manifest at its root | Waits for the Phase 7 archive and publish |
| [mcp-registry.md](mcp-registry.md) | MCP Registry | Aegis, Themis | `mcp-publisher` with GitHub login | Waits for the Phase 7 npm publish |
| [listing-copy.md](listing-copy.md) | (source of all copy) | both | Names, taglines, descriptions, example prompts, limits tested by `scripts/tests/listing-copy.test.js` | Done |

## Decisions recorded (owner, 2026-10-12)

1. Copyright and licence holder: **Kairos Foundation** (<https://kairos-foundation.org/>). The GitHub repository URL is only the repository location.
2. The GitHub repository is public (owner statement; not verified by the tooling that wrote these files).
3. Contact (updated 2026-10-13): role addresses `support@kairos-foundation.org` (support) and `privacy@kairos-foundation.org` (privacy) exist as aliases that deliver to the owner's mailbox; no personal address is published anywhere. GitHub private vulnerability reporting (<https://github.com/drupadsachania/aegis-skills/security/advisories/new>) stays the single security channel; email is for privacy and general support only. MX records point at GoDaddy mail (checked 2026-10-13); delivery from outside is untested.
4. No demo recording. ChatGPT gets Aegis as a skills-only plugin; Themis on ChatGPT is deferred. An MCP server cannot be added to a skills-only plugin later (see the decision section in [chatgpt-app.md](chatgpt-app.md)).
5. The terms-of-service page is written (`docs/legal/terms.md`, served at `/terms`). Once the site is deployed its URL is <https://aegis-skills.vercel.app/terms>. Legal review of the text and the governing-law line are owner actions.

## Consolidated owner blockers

| # | Blocker | Needed by | Notes |
|---|---|---|---|
| 1 | **Mailbox: inbound delivery verified 2026-10-13; still to do: reply test and portal verification email** | Anthropic plugin and connector portals; OpenAI support contact | The addresses are the contact fields everywhere (support@ for support, privacy@ for privacy). The owner sent a test message from an outside account (live.com) to both addresses on 2026-10-13 and both arrived in the Titan mailbox. Still to confirm before submitting: that replies work from the mail client (and show the role address if send-as is configured). For Anthropic's verified-contact step make sure you can receive a verification email at `support@kairos-foundation.org`; the portals may email a verification link. Security stays on GitHub private reporting |
| 2 | Deploy the website (Vercel, root `apps/web`, Node 24) | Aegis plugin `.mcp.json`, connector, privacy policy URL | Not deployed from this branch |
| 3 | Phase 7 npm publish of `aegis-skills@1.1.0` and `@aegis-skills/themis-plugin@1.1.0` | Themis plugin, Gemini manifest, MCP Registry | Phase 7 |
| 4 | Verified OpenAI publisher identity | ChatGPT listing | Platform dashboard, organisation settings |
| 5 | Choose the Gemini layout (recommended: release archive) | Gemini listing | See [gemini-gallery.md](gemini-gallery.md) |
| 6 | Add the `gemini-cli-extension` topic to the repository | Gemini listing | |
| 7 | Name checks for "Aegis" and "Themis" in each directory | All | Both are common names |
| 8 | Paid Claude plan with submit rights and the GitHub account connected on claude.ai | Anthropic portals | |
| 9 | Authenticate the MCP Registry publish as the `drupadsachania` GitHub account | MCP Registry | Namespace rule |
| 10 | Confirm hosting log retention to state in the privacy policy (optional) | Anthropic connector | Placeholder comment in the policy |

Removed since the previous version: the copyright holder question (decided), "repository must be public" (stated public by the owner), the security email placeholder (private vulnerability reporting is the channel), the privacy email placeholder (privacy@ written into the policy), the ChatGPT demo video and test cases (not needed for a skills-only plugin).

Phase 7 items: `scripts/build-chatgpt-bundle.js`, the Gemini release archive, the version script and the npm publish.

## Verified versus unverified sources

Official pages that were read (summarising fetch tool, 2026-10-12): the four OpenAI plugin pages and the two Gemini extension pages are listed in their runbooks, and the Anthropic pages in [anthropic-plugin.md](anthropic-plugin.md) and [anthropic-connectors.md](anthropic-connectors.md). The three uploaded notes (`D:\Downloads\anthropic_guidelines.txt`, `chatgpt_aegis_themis.md`, `gemini-marketplace.md`) are chat-assistant text. The ChatGPT note matched the official pages on the points that matter; the Gemini note did not (wrong skills and commands paths, an unconfirmed `$schema`, and a registry PR step that the releasing page contradicts). Details are in each runbook.

## Checks that guard this folder

- `node scripts/check-plugin-bundle.js` (also in `npm run check:deps`): README word count, LICENSE, exact-pinned launchers, file count and size limits, ASCII names, front matter of skills and agents.
- `npx jest scripts/tests/listing-copy.test.js`: name, tagline, description and category limits, three or more example prompts per listing.
- `npm run check:registry`: `server.json` metadata.
