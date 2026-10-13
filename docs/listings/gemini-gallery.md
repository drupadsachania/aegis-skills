# Runbook: Gemini CLI extensions gallery (Aegis extension)

Maintainer file, not product documentation. Copy and names come from [listing-copy.md](listing-copy.md).

Status as of 2026-10-13: not listed yet. The Release archives exist and `gemini extensions install` from the repository succeeded on a clean machine; the only step left is the `gemini-cli-extension` repository topic, then the daily crawl. (Older status text follows.) The extension manifest exists at `packages/aegis/gemini-extension.json`, but it is not at the repository root and nothing is on npm. The release pipeline (`scripts/build-release-assets.js`) builds `darwin.aegis-skills.zip`, `linux.aegis-skills.zip` and `win32.aegis-skills.zip` (identical content, `gemini-extension.json` at the archive root, `GEMINI.md`, README, licences and `skills/`) and attaches them to every Aegis release, which is the only kind marked Latest. Only the Aegis extension is planned; Themis has no Gemini extension.

## Sources (fetched 2026-10-12, summarising fetch tool)

| Topic | URL |
|---|---|
| Releasing extensions and gallery listing | <https://geminicli.com/docs/extensions/releasing/> |
| Extension reference (manifest fields, directories) | <https://geminicli.com/docs/extensions/reference/> |
| `https://geminicli.com/schemas/gemini-extension.json` | requested with HEAD: **HTTP 404** |
| `github.com/google-gemini/gemini-cli-extensions` and its `registry.json` | fetched: **HTTP 404** for both (also not found by a web search) |
| Owner-supplied notes | `D:\Downloads\gemini-marketplace.md`: a chat-assistant answer (model output), treated as UNVERIFIED wherever it is not matched below |

The unauthenticated `gh` CLI could not be used to query GitHub (not logged in), so "does not exist" for the two GitHub items means "a plain fetch returned 404", not "confirmed absent". The gemini-cli repository's own docs folder was not read.

## Verified against the official pages

- **Manifest location.** "Each extension needs `gemini-extension.json` in its root directory." For gallery listing it must be "in the absolute root of the repository or the release archive". Installed extensions load from `<home>/.gemini/extensions`.
- **Fields the reference page lists:** `name` (lowercase letters, digits, dashes; expected to match the extension directory name), `version`, `description` (shown on geminicli.com/extensions), `migratedTo`, `mcpServers` (same options as `settings.json` except `trust`; use `${extensionPath}`), `contextFileName` (if unset and a `GEMINI.md` exists in the extension directory, it is loaded), `excludeTools`, `plan` (`directory`), `settings` (objects with `name`, `description`, `envVar`, `sensitive`; sensitive values go to the keychain), `themes`.
- **Directories at the extension root:** `skills/<name>/SKILL.md`, `commands/*.toml` (the path sets the slash-command name; `commands/gcs/sync.toml` is `/gcs:sync`), `policies/*.toml` (`allow` and `yolo` decisions are ignored), `agents/*.md` (sub-agent definitions, described as a preview feature), `hooks/hooks.json`.
- **Gallery.** No submission: public GitHub repository, repository topic `gemini-cli-extension`, manifest at the repository or archive root. The gallery "crawls tagged repositories daily" and lists an extension that passes validation (what is validated is not documented). The releasing page mentions no PR step and no `registry.json`.
- **Release archives.** Must be fully self-contained with the manifest at the archive root. The CLI picks, in order, `{platform}.{arch}.{name}.{extension}`, `{platform}.{name}.{extension}`, then a single generic asset. `platform` is `darwin`, `linux` or `win32`; `arch` is `x64` or `arm64`; `extension` is `.tar.gz` or `.zip`. With GitHub Releases the CLI checks the release marked Latest; keep the manifest `version` equal to the release tag. `migratedTo` needs at least one release on the new repository.
- Install: `gemini extensions install <repo-uri>` (optionally `--ref`). Page banner: unpaid-tier and Google One users were moved from Gemini CLI to Antigravity CLI on 2026-06-18.

## Where the uploaded note is wrong or unverified

| Note's claim | Verdict |
|---|---|
| `"$schema": "https://geminicli.com/schemas/gemini-extension.json"` | **UNVERIFIED and apparently wrong.** The reference page does not mention `$schema`, and the URL returns 404. Do not add it |
| Skills at `.gemini/skills/<name>/SKILL.md` | **Wrong for extensions.** The reference page puts `skills/` at the extension root and does not mention `.gemini/skills` |
| Commands at `.gemini/commands/*.toml` | **Wrong for extensions.** Reference page: `commands/` at the extension root. (The note's TOML `description` and `prompt` keys and its `[options]` table with `temperature` and `model` were not checked; treat as UNVERIFIED) |
| `author`, `license`, `repository` manifest fields | **UNVERIFIED.** Not in the reference page's field list |
| `contextFileName` defaults to `GEMINI.md` | Confirmed |
| `excludeTools`, `plan.directory`, `migratedTo`, `mcpServers` with `${extensionPath}` | Confirmed |
| Gallery needs a PR adding the repo to `google-gemini/gemini-cli-extensions` `registry.json` | **Not confirmed; contradicted by the releasing page** (no submission needed, topic-based crawl). The repo and file returned 404 |
| "Automated indexer crawls tagged repositories" | Confirmed |
| `name` must match the repository or directory name | Reference page says it is "expected to match the extension directory name" |

## Diff against `packages/aegis/gemini-extension.json`

The file has `name`, `version`, `description`, `contextFileName` and `mcpServers.aegis` (`npx -y aegis-skills@1.5.0 mcp`, env `AEGIS_NO_AUTO_REFRESH=1`). Every one of those is a verified field and the `npx` pin is exact. **Diff to apply: none.** Nothing was changed. Do not add `$schema`, `author`, `license` or `repository` (unverified).

## Recommended release-archive layout (built by `scripts/build-release-assets.js`; file names as built are `{platform}.aegis-skills.zip` for darwin, linux and win32, per the documented `{platform}.{name}.{ext}` pattern, not the single generic asset described below)

Option A from the earlier analysis, now recommended: attach one archive to the GitHub Release marked Latest, so the repository can stay a monorepo.

```
aegis-skills.zip            (a single generic asset; the page does not name the generic file, so keep the name short and platform-free)
  gemini-extension.json     (from packages/aegis, version rewritten by the version script)
  GEMINI.md                 (from packages/aegis)
  README.md
  LICENSE, LICENSE-MIT, LICENSE-APACHE
  skills/<24 skill folders>/SKILL.md (+ references)
```

Not needed: `commands/` (Aegis defines no slash commands), `agents/` (preview), `.gemini/` (not read for extensions), `hooks/`, `policies/`. Manifest to use: the current file, with `version` equal to the release tag. If the owner prefers a platform-specific name instead, `linux.x64.aegis-skills.zip` style assets follow the documented pattern, but a platform-independent extension should use the single generic asset.

One thing to decide: the docs require a "fully self-contained" archive, yet the manifest runs `npx -y aegis-skills@1.5.0 mcp`, which downloads the pinned package from npm on first use (disclosed in the README). That is acceptable for the skills, which are in the archive; if the owner wants the MCP server to work offline, bundle `mcp/` and its three dependencies and point `command` at `node ${extensionPath}/mcp/...`. Not required for listing, and not recommended now.

Also keep the repository root clean of a second copy of the manifest unless option B or C is chosen: `scripts/check-layout.js` would then have to guard the copy.

## Blockers (USER ACTION unless stated)

1. **Choose option A, B or C** (the earlier table): A (release archive) is recommended; B (copy at repo root) and C (separate repository) remain valid. Not decided by the owner yet.
2. ~~Repository public~~ **Satisfied per the owner (2026-10-12); not verified here.** Still to do: add the `gemini-cli-extension` topic in the repository About section.
3. **Phase 7 publish** of `aegis-skills@1.5.0`: the manifest runs `npx -y aegis-skills@1.5.0 mcp`, which fails until that version is on npm. Phase 7 also builds the archive and the Latest release.
4. ~~Copyright and licence holder~~ **Decided 2026-10-13: the individual maintainer, Drupad Sachania (an independent project, no organisation).**
5. **Name check** for "aegis" in the gallery.
6. No terms-of-service URL is requested by the pages read; if one is asked for, it is <https://aegis-skills.vercel.app/terms> once deployed (`docs/legal/terms.md`).
7. No verified contact channel is requested by the Gemini pages read; the mailbox status in [README.md](README.md) does not block this listing.

## Steps once the blockers are cleared

1. Build the archive (Phase 7), publish the GitHub Release as Latest, check `version` equals the tag.
2. Test on a clean machine: `gemini extensions install https://github.com/drupadsachania/aegis-skills` (not tested; the CLI was not run), then list skills and confirm the `aegis` MCP server connects.
3. Add the `gemini-cli-extension` topic and wait for the daily crawl.
4. Check <https://geminicli.com/extensions>. The validation step is undocumented; if the extension does not appear, look in the Gemini CLI repository's issues.

The gallery description comes from the manifest `description`; use the Aegis one-liner from `listing-copy.md` if the wording needs to change.
