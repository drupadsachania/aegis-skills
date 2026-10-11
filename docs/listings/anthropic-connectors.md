# Runbook: Anthropic Connectors directory (hosted Aegis MCP)

Maintainer file, not product documentation. Copy and names come from [listing-copy.md](listing-copy.md).

Status as of 2026-10-12: not submitted, not listed. The route exists in the repository and passes its tests, but the site is not deployed from this branch. Nothing in this runbook can be completed before the Vercel step.

## Sources (fetched 2026-10-12)

| Topic | URL |
|---|---|
| Submit a connector (requirements, portal steps) | <https://claude.com/docs/connectors/building/submission> |
| Connector pre-submission checklist (tool design, review criteria) | <https://claude.com/docs/connectors/building/review-criteria> |
| Anthropic outbound IP addresses | <https://platform.claude.com/docs/en/api/ip-addresses> |
| Owner-supplied summary of the same rules (chat-assistant text, not an official source) | `D:Downloadsanthropic_guidelines.txt`, read 2026-10-12 |

## Blockers (USER ACTION unless stated)

1. **Deploy the site** (Vercel root directory `apps/web`, Node 24). `https://aegis-skills.vercel.app/api/mcp` must answer over HTTPS; the portal asks for the URL and syncs the tools from it.
2. ~~Copyright and licence holder~~ **Decided 2026-10-12: Kairos Foundation.** The Company step takes "Kairos Foundation" and <https://kairos-foundation.org/>. The repository is public per the owner (not verified here).
3. **Verified support contact (USER ACTION, blocks submission).** The Listing step needs a privacy policy URL, a documentation URL and a support contact, and the uploaded guidelines list "verified contact and support channels" as a developer duty. The privacy policy now names GitHub Issues and private vulnerability reporting as the interim contact; the owner has no foundation mailbox and will not publish a personal email. Recommended fix: a role alias (`support@` / `privacy@kairos-foundation.org`) with free email forwarding at the DNS host. `nslookup -type=MX kairos-foundation.org` showed no MX records on 2026-10-12, so no mail exists yet.
4. **Hosting retention** note in the same policy is a placeholder to confirm.
5. **Name check** for "Aegis" in the connector directory.
6. **Anthropic egress range** `160.79.104.0/21` was confirmed on 2026-10-12 against the IP addresses page (listed there as the stable outbound range for MCP tool calls). Re-check it right before submitting; the code exempts it in `apps/web/lib/rate-limit.ts`.
7. A paid Claude plan and a role that may submit.

## Requirements and where Aegis stands

| Requirement (from the pages above) | Aegis |
|---|---|
| Remote server reachable over HTTPS | `https://aegis-skills.vercel.app/api/mcp`, Streamable HTTP, stateless. Works after the deploy |
| Every tool has a `title` and `readOnlyHint` or `destructiveHint` | Done: `annotations.title` plus read-only hints on `list_skills`, `get_skill`, `get_skill_phase` (`packages/aegis/tests/mcp-server.test.js`) |
| Authentication | No authentication, which the submission page lists as a valid choice for public data. Pick "no authentication" in the Authentication step |
| Tool names 64 characters or fewer | Yes |
| Tool descriptions narrow and accurate, no instructions to the model (the guidelines treat descriptions as an attack surface: calling other tools, hidden or encoded text, promotion, overriding instructions each cause rejection) | Reviewed 2026-10-12. The `get_skill_phase` description and the server `instructions` text used to say which other tool to call; they now only describe what each tool returns. No hidden or encoded text, no promotion. Re-read them in the portal's Tools step |
| Read and write tools separated | All tools are read-only |
| Valid input handled, actionable errors | Skill names are validated against a strict pattern; unknown skills and phases return an error message |
| Responses reasonably sized | Phase text is capped at 20000 characters |
| No conversation data collection | The server stores nothing and makes no model calls |
| Privacy policy link | `docs/themis/privacy-policy.md`, published on the site at `/docs/themis/privacy-policy` once deployed |
| Documentation | `docs/aegis/hosted-mcp.md`, published at `/docs/aegis/hosted-mcp` |
| Test account for reviewers | The server needs no account. State that in the Test and launch step and give the prompts from `docs/themis/test-prompts.md` |
| Directory terms and policy | Read both; seven compliance acknowledgements are required in the portal |

### Rate limiting

The submission pages do not require a rate limit. The server has a best-effort in-memory limit of 120 requests a minute per client IP, exempting Anthropic's outbound range, so Claude's own traffic is never throttled. It works per server instance, so on serverless hosting it is a brake on bursts and not a hard quota. The client IP is the first hop of `x-forwarded-for`, which Vercel overwrites; Vercel's docs state it does not forward client-supplied values (<https://vercel.com/docs/headers/request-headers>, retrieved 2026-10-12). Do not move the site behind another proxy without re-checking this.

## Steps

1. Test every tool in MCP Inspector and as a custom connector in Claude (menu path: see `docs/aegis/hosted-mcp.md`; the connector docs are at <https://claude.com/docs/connectors/building/testing>, not fetched). The portal asks you to confirm you did.
2. Open <https://claude.ai/directory/manage>, **Submit new**, **MCP connector**.
3. **Connection.** Paste the HTTPS URL.
4. **Tools.** Confirm all three tools show as read-only with titles.
5. **Listing.** Name, tagline (55 characters or fewer), description (2,000 or fewer) and categories (one to five) from the "Directory listing fields" table and long description in `listing-copy.md` (`scripts/tests/listing-copy.test.js` enforces the limits), at least three example prompts (`listing-copy.md`), documentation URL, privacy policy URL, support contact, icon (`apps/web/public/brand/aegis-icon.svg`, or the PNG/WebP marks beside it), and the URL slug. The slug is permanent once published.
6. **Use cases.** Read-only lookup of defensive security methodology; no setup needed; reads data only.
7. **Company.** Kairos Foundation, <https://kairos-foundation.org/>.
8. **Authentication.** No authentication.
9. **Data handling.** First-party content, no personal health data, no sponsored content.
10. **Test and launch.** Reviewer instructions: no account is needed; use the ten prompts in `test-prompts.md`; every tool is read-only. The guidelines also say a test account with sample data is a developer duty; here the state is "no account exists because nothing is gated".
11. **Compliance.** Seven acknowledgements. Two are worth reading against Aegis: the prompt-injection acknowledgement (the tools return fixed public skill text, and phase text is served as data) and the public documentation acknowledgement.
12. Submit. Anthropic scans automatically and, by default, lists the connector as a Community connector; some submissions also get a human review. Escalations: `mcp-review@anthropic.com`.

MCP App screenshots are not needed (Aegis has no UI resources).

## Not covered

The pages fetched do not give review turnaround times, and the Verified label is assessed automatically; nothing here can promise either.
