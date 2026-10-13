# Runbook: MCP Registry (Aegis and Themis)

Maintainer file, not product documentation. Copy and names come from [listing-copy.md](listing-copy.md).

Status as of 2026-10-12: nothing published to the registry. The registry only hosts metadata, so both npm packages must be published first (Phase 7). The `server.json` files and `mcpName` fields are ready and checked by `npm run check:registry`.

## Sources (fetched 2026-10-12)

| Topic | URL |
|---|---|
| Quickstart: publish with `mcp-publisher` | <https://modelcontextprotocol.io/registry/quickstart> |
| Publishing remote servers | <https://modelcontextprotocol.io/registry/remote-servers> |

The registry is described as in preview: "Breaking changes or data resets may occur before general availability." The authentication page (DNS and other methods) was not fetched; only GitHub authentication is used here.

## Blockers (USER ACTION unless stated)

1. **Phase 7 publish** of `aegis-skills@1.5.0` and `@aegis-skills/themis-plugin@1.1.0`. The registry checks that the published package matches its metadata; a missing package fails validation.
2. **The GitHub account that authenticates must be `drupadsachania`.** With GitHub authentication the server name must start with `io.github.<username>/`. Both names use `io.github.drupadsachania/`, so log in as that account or the publish is refused ("You do not have permission to publish this server").
3. **Deploy the site** before publishing Aegis, because its `server.json` lists the remote `https://aegis-skills.vercel.app/api/mcp`, and the page says a remote server must be publicly accessible at its URL.
4. ~~Copyright and licence holder~~ **Decided 2026-10-12: Kairos Foundation.** The registry name still uses the GitHub user namespace `io.github.drupadsachania/` (that is how GitHub authentication works), while the entry's repository and website describe Kairos Foundation. The repository is public per the owner (not verified here). The registry pages read do not ask for a support mailbox; the mailbox delivery test in [README.md](README.md) does not block this listing.
5. **Name check**: search the registry for existing `aegis` and `themis` servers.
6. **Terms of service URL.** The registry does not ask for one in the pages read; if a listing form does, give <https://aegis-skills.vercel.app/terms> once the site is deployed (`docs/legal/terms.md`).

## Current metadata

| File | Name | Version | Description length |
|---|---|---|---|
| `packages/aegis/server.json` | `io.github.drupadsachania/aegis-skills` | 1.5.0 | 91 |
| `packages/themis-plugin/server.json` | `io.github.drupadsachania/themis` | 1.1.0 | 93 |

Both packages declare a matching `mcpName` in `package.json`; `scripts/check-registry-meta.js` asserts descriptions of 100 characters or fewer, `mcpName` equal to `server.json` `name`, the `io.github.drupadsachania/` prefix, and version and package identifier parity. The Aegis file declares both the npm package (`stdio`, argument `mcp`) and the remote; the Themis file declares only the npm package.

## Steps (as given in the quickstart)

1. Confirm the checks: `npm run check:registry`.
2. Publish the npm packages (Phase 7). Verify each at its npm URL.
3. Install the publisher. The quickstart gives a download command per platform and `brew install mcp-publisher`; check with `mcp-publisher --help`. Its commands are `init`, `login`, `logout` and `publish`.
4. Authenticate: `mcp-publisher login github`, then open <https://github.com/login/device>, enter the printed code, authorise. Do this as the `drupadsachania` account.
5. Publish each server from the folder holding its `server.json`: `mcp-publisher publish` in `packages/aegis`, then in `packages/themis-plugin`.
6. Verify: `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.drupadsachania/aegis-skills"`, and the same for `themis`.

Troubleshooting table from the quickstart: "Registry validation failed for package" means the package lacks `mcpName` or it does not match; "Invalid or expired Registry JWT token" means log in again; a permission error means the authenticated GitHub user does not match the namespace.

Each new version needs a new `server.json` version and a new publish. Phase 7's version script is the place to keep `server.json`, `package.json` and the `.mcp.json` pins in step; `check:registry` fails the build if they drift.

The quickstart also links a GitHub Actions publishing guide, which was not fetched; do not wire that without reading it.
