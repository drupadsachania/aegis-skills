# Release runbook (owner)

Maintainer document, not product documentation. Written 2026-10-13 for the Phase 7 release of three npm packages:

| Order | Package | Version | Tag |
|---|---|---|---|
| 1 | `aegis-skills` | 1.5.0 | `aegis-skills@1.5.0` |
| 2 | `@aegis-skills/themis-core` | 0.1.0 | `@aegis-skills/themis-core@0.1.0` |
| 3 | `@aegis-skills/themis-gateway` | 0.1.0 | `@aegis-skills/themis-gateway@0.1.0` |

Nothing in this runbook has been run. Every command is for you to run from **Git Bash** in the repository root unless it says otherwise. The repository is `drupadsachania/aegis-skills`.

What is NOT released here: `@aegis-skills/themis-plugin` and `@aegis-skills/themis` (the Themis plugin and app). They are Phase 8. Section 7 explains what happens if their tags are pushed anyway.

## How the pipeline works (read once)

1. You merge to `main`, create an **annotated** tag `<npm-name>@<version>` on a commit that is on `main`, and push that one tag.
2. `.github/workflows/release.yml` starts. It has five jobs: `resolve` (tag to package, allow-list, annotated, on main, versions agree), `verify` (no secrets: install, lint, tests, tarball assertions, builds the exact tarball and the release assets), `publish` (the only job with `id-token: write`; installs nothing; `npm publish <tarball> --provenance`), `github-release` (notes, assets, `--verify-tag`; only Aegis is marked Latest) and `smoke` (installs the published version from the registry on Linux, Windows and macOS).
3. Authentication: npm **trusted publishing** (OIDC). A package name that does not exist yet cannot have a trusted publisher, so the very first version of each package is published with a short-lived token stored as the environment secret `NPM_BOOTSTRAP_TOKEN`. When that secret exists the workflow uses it; when it does not, the workflow uses OIDC. Section 3 switches over and then deletes the secret.
4. Environment name: `npm-publish`. Workflow file: `release.yml`. Do not rename either; npm stores both and cannot edit them later.

## 0. Prerequisites

### 0.1 npm account and scope

1. Sign in at <https://www.npmjs.com>. Enable two-factor authentication for **authorization and writes** (Account, Two-Factor Authentication).
2. The scope `@aegis-skills` already exists and you own it: `@aegis-skills/core` 1.0.0 is published there (checked 2026-10-13). Confirm you can publish into it: <https://www.npmjs.com/settings/aegis-skills/packages> (or your user page if it is a user scope).
3. `npm login` once on your machine (browser sign-in), for sections 5 and 6: `npm whoami` prints your user name.

### 0.2 Package name check (run right before tagging)

Run now and again immediately before section 2:

```bash
for p in aegis-skills @aegis-skills/themis-core @aegis-skills/themis-gateway @aegis-skills/themis-plugin @aegis-skills/themis @aegis-skills/core; do
  echo "== $p"; npm view "$p" name version 2>&1 | head -2
done
```

Result recorded **2026-10-13** (by the release-pipeline author, from this machine, npm 11.6.2):

| Package | Result |
|---|---|
| `aegis-skills` | `E404 Not Found`, the name is unclaimed |
| `@aegis-skills/themis-core` | `E404`, unclaimed |
| `@aegis-skills/themis-gateway` | `E404`, unclaimed |
| `@aegis-skills/themis-plugin` | `E404`, unclaimed (not released in this phase) |
| `@aegis-skills/themis` | `E404`, unclaimed (not released in this phase) |
| `@aegis-skills/core` | exists, version 1.0.0 (deprecated in section 5) |

An `E404` today does not reserve the name. If a name is taken when you run it again, stop: that is a naming decision (master plan, contracts section 3), not something to work around.

### 0.3 The code must be on `main`

All of this work is on the branch `restructure`; `main` has not been touched. The release workflow runs from tags that point at commits on `main`, and the workflow files must exist there.

```bash
git switch restructure && git status --short        # must print nothing
git push -u origin restructure
gh pr create --base main --head restructure --title "Restructure: Aegis/Themis monorepo and release pipeline" --body "Release pipeline and runbook. Nothing is published by merging."
gh pr checks --watch                                  # every check green
```

Merge the PR in the GitHub UI (any merge method; a squash is fine because tags are created afterwards on the merge commit). Then:

```bash
git switch main && git pull --ff-only
git log -1 --oneline
gh run list --branch main --workflow CI --limit 1 --json conclusion -q '.[0].conclusion'    # success
```

## 1. GitHub repository settings

Do these in the browser at `https://github.com/drupadsachania/aegis-skills/settings`.

1. **Actions, General.**
   - Actions permissions: "Allow drupadsachania, and select non-drupadsachania, actions and reusable workflows" with "Allow actions created by GitHub" ticked. Every workflow uses only `actions/checkout`, `actions/setup-node`, `actions/upload-artifact` and `actions/download-artifact`, pinned by commit SHA.
   - Workflow permissions: "Read repository contents and packages permissions". Leave "Allow GitHub Actions to create and approve pull requests" unticked. Each workflow declares its own permissions.
   - Fork pull request workflows: "Require approval for all external contributors".
2. **Environments, New environment `npm-publish`.**
   - Deployment branches and tags: "Selected branches and tags". Add: branch `main`; tags `aegis-skills@*`, `@aegis-skills/themis-core@*`, `@aegis-skills/themis-gateway@*`.
   - No required reviewers (decide otherwise only if you want a manual click before each publish; the run then waits at the `publish` job).
   - Environment secret: add `NPM_BOOTSTRAP_TOKEN` only when you reach section 2, not earlier (7-day token).
3. **Branch protection / ruleset for `main`.** The release does not need a loophole: tags are pushed by you, and the workflow only reads the repository. Compatible setup:
   - Require a pull request; require these status checks (names as shown on a PR): `Lint & guards`, `Test (ubuntu-latest, Node 24)`, `Test (windows-latest, Node 24)`, `Test (macos-latest, Node 24)`, `Web build`, `Pack (aegis)`, `Pack (themis-core)`, `Pack (themis-gateway)`, `Pack (themis-plugin)`, `Pack (themis)`, `Install aegis-skills (ubuntu-latest)`, `Install aegis-skills (windows-latest)`, `Install aegis-skills (macos-latest)`, `Install themis (ubuntu-latest)`, `Install themis (windows-latest)`.
   - Block force pushes and deletions.
   - Bypass list: you (Repository admin). The monthly health bot and your local intel-sync push to `main` directly and need this bypass.
4. **Optional tag ruleset** `release-tags` (target tags `aegis-skills@*` and `@aegis-skills/**`): restrict updates and deletions; leave creation allowed for you (Repository admin bypass). Do not add a "restrict creations" rule without the bypass or you cannot push a release tag.
5. **Personal access token: only if you later enable `intel-release.yml`.** It ships disabled. If you enable it (its header lists the steps), create environment `release-bot` with secret `RELEASE_PAT`: a fine-grained PAT, this repository only, permission Contents: Read and write, expiry 90 days at most, owner allowed to bypass the `main` ruleset and to create tags. Nothing in sections 2 to 6 needs a PAT.

Verify (read-only):

```bash
gh api repos/drupadsachania/aegis-skills/environments --jq '.environments[].name'
gh api repos/drupadsachania/aegis-skills/rulesets --jq '.[].name'
gh workflow list
```

`gh workflow list` shows `Release`, `CI`, `Skill Health Check` and `Aegis intel patch release`.

## 2. First publish (bootstrap), one package at a time

Order is fixed: `aegis-skills`, then `@aegis-skills/themis-core`, then `@aegis-skills/themis-gateway` (gateway depends on core `^0.1.0`; the publish job also waits up to 20 minutes for core to appear on the registry). Push one tag, wait for the run to finish green, verify from the registry, then push the next.

### 2.1 Dry run first

Do the section 8 dry run on the merged `main`. Do not continue if any step fails.

### 2.2 Create the bootstrap token (valid 7 days)

1. npmjs.com, your avatar, Access Tokens, Generate New Token, **Granular Access Token**.
2. Name `aegis-bootstrap`, expiration **7 days**, permissions: Packages and scopes, **Read and write**, **All packages** (the names do not exist yet, so they cannot be picked one by one), tick **Bypass two-factor authentication** (without it a CI publish cannot satisfy 2FA).
3. Copy the token. Store it as the environment secret (the command prompts you to paste it; it is never put on the command line or in a file):

```bash
gh api -X PUT repos/drupadsachania/aegis-skills/environments/npm-publish --silent      # no-op if you already created it
gh secret set NPM_BOOTSTRAP_TOKEN --env npm-publish --repo drupadsachania/aegis-skills
gh secret list --env npm-publish --repo drupadsachania/aegis-skills                    # NPM_BOOTSTRAP_TOKEN is listed
```

Never paste the token into chat, a file or a commit.

### 2.3 Create the three annotated tags on `main`

```bash
git switch main && git pull --ff-only
node scripts/check-versions.js --tag aegis-skills@1.5.0                 # prints latest=true
node scripts/check-versions.js --tag @aegis-skills/themis-core@0.1.0
node scripts/check-versions.js --tag @aegis-skills/themis-gateway@0.1.0

git tag -a "aegis-skills@1.5.0" -m "aegis-skills@1.5.0"
git tag -a "@aegis-skills/themis-core@0.1.0" -m "@aegis-skills/themis-core@0.1.0"
git tag -a "@aegis-skills/themis-gateway@0.1.0" -m "@aegis-skills/themis-gateway@0.1.0"

for t in "aegis-skills@1.5.0" "@aegis-skills/themis-core@0.1.0" "@aegis-skills/themis-gateway@0.1.0"; do
  echo "$t -> $(git cat-file -t "refs/tags/$t")"
done                                                                     # each must say: tag (annotated), not commit
```

### 2.4 Push `aegis-skills@1.5.0` and watch

```bash
git push origin "refs/tags/aegis-skills@1.5.0"
sleep 10
RUN=$(gh run list --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId'); echo "$RUN"
gh run watch "$RUN" --exit-status
```

Expected jobs, all green: `Resolve tag`, `Verify aegis-skills@1.5.0`, `Publish to npm`, `GitHub Release`, three `Smoke test from npm`.

Verify from the registry and GitHub:

```bash
npm view aegis-skills@1.5.0 version dist.tarball dist.attestations.provenance.predicateType
#   version = '1.5.0', predicateType = 'https://slsa.dev/provenance/v1'
npm view aegis-skills dist-tags --json                                  # { "latest": "1.5.0" }

T=$(mktemp -d) && cd "$T" && npm init -y >/dev/null && npm install --no-audit --no-fund aegis-skills@1.5.0
npx --no -- aegis --version                                              # contains 1.5.0
npm audit signatures                                                     # "... verified attestation"
cd - >/dev/null

gh release view "aegis-skills@1.5.0" --json assets -q '.assets[].name' | sort
#   31 files: 24 aegis-skill-<name>-1.5.0.zip, aegis-prompts-1.5.0.zip, aegis-chatgpt-plugin-1.5.0.zip,
#   darwin.aegis-skills.zip, linux.aegis-skills.zip, win32.aegis-skills.zip, aegis-skills-1.5.0.tgz, SHA256SUMS
gh release list --limit 5                                                # aegis-skills@1.5.0 carries the "Latest" label
```

Check the checksums of what GitHub serves:

```bash
D=$(mktemp -d) && gh release download "aegis-skills@1.5.0" --dir "$D" && (cd "$D" && sha256sum -c SHA256SUMS | grep -vc ': OK$')   # prints 0
```

### 2.5 Push `@aegis-skills/themis-core@0.1.0`, then `@aegis-skills/themis-gateway@0.1.0`

Repeat 2.4 with each tag (core first; wait for it to be green):

```bash
git push origin "refs/tags/@aegis-skills/themis-core@0.1.0"
sleep 10; RUN=$(gh run list --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId'); gh run watch "$RUN" --exit-status
npm view @aegis-skills/themis-core@0.1.0 version dist.attestations.provenance.predicateType

git push origin "refs/tags/@aegis-skills/themis-gateway@0.1.0"
sleep 10; RUN=$(gh run list --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId'); gh run watch "$RUN" --exit-status
npm view @aegis-skills/themis-gateway@0.1.0 version dependencies dist.attestations.provenance.predicateType
```

Both releases are created with `--latest=false`; `gh release list --limit 5` must still show `aegis-skills@1.5.0` as Latest (Gemini CLI reads the Latest release).

### 2.6 If something fails

- **Before `Publish to npm` ran** (resolve, verify failed): nothing is on npm. Delete the tag, fix on a branch, merge, re-tag:
  ```bash
  git push origin ":refs/tags/<tag>" && git tag -d "<tag>"
  ```
- **`Publish to npm` succeeded but a later job failed** (release, smoke): the version is on npm. Never re-tag or re-publish the same version. Re-run only the failed job (`gh run rerun "$RUN" --failed`); the publish job skips versions already on npm. If the package itself is broken, go to section 6.
- **`401`/`403` at publish with the token**: the token expired, lacks "All packages" or "Bypass 2FA". Make a new token (2.2), update the secret, run the workflow again with `gh workflow run release.yml -f tag="<tag>"`.

## 3. Switch to trusted publishing (do this within the same day)

A trusted publisher can only be configured on a package that exists, which is why section 2 came first. A new trusted-publisher configuration **expires if it has not completed a successful publish within 2 days**, so configure all three, then do the validation patches within 48 hours.

### 3.1 Configure the three trusted publishers

For each of `aegis-skills`, `@aegis-skills/themis-core`, `@aegis-skills/themis-gateway`: npmjs.com, the package page, **Settings**, **Trusted Publisher**, choose **GitHub Actions**, and enter exactly:

| Field | Value |
|---|---|
| Organization or user | `drupadsachania` |
| Repository | `aegis-skills` |
| Workflow filename | `release.yml` |
| Environment name | `npm-publish` |

Save. The filename is case sensitive. The page may differ slightly from this description (npm changes its settings pages); if it offers no GitHub Actions option, stop and check the npm docs on trusted publishing.

### 3.2 Delete the bootstrap secret BEFORE the validation tags

The validation run must succeed without the token; that is what proves OIDC works. With the secret gone the workflow runs its OIDC publish step and skips the token step.

```bash
gh secret delete NPM_BOOTSTRAP_TOKEN --env npm-publish --repo drupadsachania/aegis-skills
gh secret list --env npm-publish --repo drupadsachania/aegis-skills       # NPM_BOOTSTRAP_TOKEN no longer listed
```

### 3.3 Validation patch of each package (within 48 hours)

One branch with three bump commits. `bump-version` rewrites every file that embeds the version (manifests, lockfile, pins, listings, docs table). It prints the tag to create.

```bash
git switch main && git pull --ff-only && git switch -c release/trusted-publishing-validation

npm run bump -- aegis patch                  # aegis-skills 1.5.0 -> 1.5.1, prints TAG=aegis-skills@1.5.1
git status --short                           # review the 14 files it changed
git add -A packages .claude-plugin listings docs apps/web/package.json package-lock.json
git commit -m "chore(release): aegis-skills@1.5.1"

npm run bump -- themis-core patch            # 0.1.0 -> 0.1.1
git add -A packages docs package-lock.json
git commit -m "chore(release): @aegis-skills/themis-core@0.1.1"

npm run bump -- themis-gateway patch         # 0.1.0 -> 0.1.1
git add -A packages docs package-lock.json
git commit -m "chore(release): @aegis-skills/themis-gateway@0.1.1"

npm run check:versions
git push -u origin release/trusted-publishing-validation
gh pr create --base main --title "chore(release): trusted publishing validation patches" --body "aegis-skills 1.5.1, themis-core 0.1.1, themis-gateway 0.1.1. Proves OIDC publishing."
gh pr checks --watch
```

Merge the PR (any merge method), then tag the merge commit and push one tag at a time in the same order as section 2:

```bash
git switch main && git pull --ff-only
git tag -a "aegis-skills@1.5.1" -m "aegis-skills@1.5.1"
git tag -a "@aegis-skills/themis-core@0.1.1" -m "@aegis-skills/themis-core@0.1.1"
git tag -a "@aegis-skills/themis-gateway@0.1.1" -m "@aegis-skills/themis-gateway@0.1.1"

git push origin "refs/tags/aegis-skills@1.5.1"
sleep 10; RUN=$(gh run list --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId'); gh run watch "$RUN" --exit-status
gh run view "$RUN" --json jobs -q '.jobs[] | select(.name=="Publish to npm") | .steps[] | select(.name | test("Publish with provenance")) | "\(.conclusion)  \(.name)"'
#   success  Publish with provenance (trusted publishing, OIDC)
#   skipped  Publish with provenance (one-time bootstrap token, first version of a new package)
npm view aegis-skills@1.5.1 version dist.attestations.provenance.predicateType
```

Repeat the push, watch, step check and `npm view` for `@aegis-skills/themis-core@0.1.1` and then `@aegis-skills/themis-gateway@0.1.1`.

If the OIDC step fails with an authentication error, do not recreate the secret yet: re-check the four trusted-publisher fields (3.1), the environment name and the workflow filename; then re-run with `gh workflow run release.yml -f tag="<tag>"`. If the 2-day window passed, delete the configuration on npmjs.com and create it again.

### 3.4 Disallow tokens and revoke the bootstrap token

Only after all three validation versions published through OIDC:

1. For each package on npmjs.com: **Settings**, **Publishing access**, choose **Require two-factor authentication and disallow tokens**, save.
2. npmjs.com, Access Tokens: delete `aegis-bootstrap` (it expires on its own after 7 days).
3. Confirm the secret is gone: `gh secret list --env npm-publish --repo drupadsachania/aegis-skills` prints nothing.

From now on every release is the "manual release procedure" at the end of this file.

## 4. Flip the website install flags and redeploy

The site marks every Aegis install that needs npm, the GitHub marketplace or the GitHub release as "Available after the first release". One constant controls all of them.

Flip only after you checked: `npm view aegis-skills version` prints a version; `gh release list --limit 1` shows `aegis-skills@1.5.0` or later as Latest; in Claude Code `/plugin marketplace add drupadsachania/aegis-skills` then `/plugin install aegis@aegis-skills` works; `npx aegis-skills@1.5.0 install --platform claude --project` works in an empty folder.

**The one-line change** in `apps/web/lib/install-commands.js`:

```diff
-const AEGIS_PUBLISHED = false
+const AEGIS_PUBLISHED = true
```

The test that guards it is `apps/web/tests/lib/install-commands.test.js` (it evaluates the file with the constant set both ways and checks that only the Aegis markers disappear, the Themis rows stay "in development" and the commands do not change). The whole web suite passes with the constant `true` or `false` (checked 2026-10-13):

```bash
git switch main && git pull --ff-only && git switch -c site/aegis-published
sed -i 's/^const AEGIS_PUBLISHED = false/const AEGIS_PUBLISHED = true/' apps/web/lib/install-commands.js
git diff --stat                                              # exactly one line changed in one file
(cd apps/web && npx jest)                                    # all green
```

Then update the prose that still says nothing is published (search results of 2026-10-13; the tests do not check these, so edit by hand and read each sentence):

```bash
grep -rn "first release\|Nothing is published\|nothing is published" README.md docs/aegis docs/themis apps/web/pages apps/web/components | grep -v node_modules
```

Known places: `README.md` (status line), `docs/aegis/install.md`, `docs/aegis/index.md`, `docs/aegis/mcp.md`, `docs/themis/versions.md` ("Nothing is published to npm yet"; update only for the three released packages, Themis plugin and app are still unreleased), `apps/web/pages/index.js`, `apps/web/pages/mcp.js`, `apps/web/pages/themis.js`. Keep every statement about Themis as it is: Themis plugin and app are in development and not published.

```bash
git add -A && git commit -m "feat(web): Aegis installs are available (aegis-skills 1.5.0 is on npm)"
git push -u origin site/aegis-published && gh pr create --base main --title "feat(web): Aegis installs are available" --body "Flips AEGIS_PUBLISHED and updates the status wording."
```

Merge. Redeploy: if the Vercel project is connected to this repository, a merge to `main` deploys automatically; otherwise deploy from the Vercel dashboard (Deployments, Redeploy) and follow `docs/DEPLOY.md`, "Post-deploy smoke checklist". On the live site, open `/paths` and `/skills/mitre-attack`: the Skill pack rows show no "after the first release" note and the Themis rows still say "In development".

## 5. Deprecate `@aegis-skills/core`

Do this after section 2 and once the site and migration notes (the `aegis-skills@1.5.0` release page) are live. Local, needs your 2FA code. There is no final notice release of core (it would mean publishing the old monolith again with a token).

```bash
npm whoami
npm deprecate "@aegis-skills/core@*" "Replaced by aegis-skills (skill pack and installer: npx aegis-skills install). Themis is in development and not released yet. Migration notes: https://github.com/drupadsachania/aegis-skills/releases/tag/aegis-skills%401.5.0" --otp=<your 6-digit code>
npm view @aegis-skills/core@1.0.0 deprecated        # prints the message above
```

Undo with an empty message: `npm deprecate "@aegis-skills/core@*" ""`.

## 6. Rollback

1. **A version on npm is bad.** Do not unpublish (npm allows it only briefly and it breaks anyone who installed it; it is for leaked secrets and needs npm support after 72 hours). Deprecate and move `latest` back, from your machine with `npm login` and 2FA:
   ```bash
   npm deprecate "aegis-skills@1.5.1" "Broken release, use aegis-skills@1.5.0 or later. See https://github.com/drupadsachania/aegis-skills/releases" --otp=<code>
   npm dist-tag add aegis-skills@1.5.0 latest --otp=<code>
   npm view aegis-skills dist-tags --json
   ```
   Use the matching package names and versions for the two libraries.
2. **GitHub release.** Mark the bad release as a pre-release so it is not offered: `gh release edit "aegis-skills@1.5.1" --prerelease --latest=false`. For Aegis, re-point Latest so Gemini users get a good archive: `gh release edit "aegis-skills@1.5.0" --latest`. Delete only if you must: `gh release delete "<tag>" --yes` (the tag stays, never delete or move a published tag).
3. **Fix forward.** Fix on a branch, bump a patch (`npm run bump -- <aegis|themis-core|themis-gateway> patch`), merge, tag, push (the manual procedure below).
4. **Leaked token or secret.** Revoke it on npmjs.com immediately, then follow npm's guidance on unpublishing a version that contains a secret.
5. **Website.** Set `AEGIS_PUBLISHED` back to `false` (section 4) if installs must be hidden again.

## 7. What NOT to do

- **Do not push tags for `@aegis-skills/themis-plugin` or `@aegis-skills/themis`.** They are not released in this phase (Phase 8). `release.yml` does not even start for them: its tag filters list only the three allowed packages. If you start it by hand with such a tag (`gh workflow run release.yml -f tag=...`) the `Resolve tag` job fails with "not releasable yet", by design. Do not widen the allow-list (`RELEASABLE` in `scripts/lib/release-manifests.js` and the case statement in the `resolve` job) before Phase 8.
- Do not create lightweight tags (`git tag name` without `-a`): the resolve job rejects them.
- Do not move, delete or re-use a tag after its version is on npm, and never publish the same version twice.
- Do not run `npm publish` from your machine. Provenance only comes from the workflow.
- Do not leave `NPM_BOOTSTRAP_TOKEN` in the environment after the validation patches, and do not paste it anywhere except the `gh secret set` prompt.
- Do not rename `release.yml` or the `npm-publish` environment; the trusted publishers are bound to both and cannot be edited, only recreated.
- Do not put `[skip ci]` in a release commit: it suppresses the tag-triggered workflow.
- Do not mark a Themis library release as Latest on GitHub: Gemini reads Aegis archives from the Latest release.
- Do not enable `intel-release.yml` before the first manual release is done and the trusted publishers work (its header lists the conditions). Do not use `bump-version --commit` by hand: a squash merge would leave the tag on a commit that is not on `main`.
- Do not edit `.github/workflows` and a version in one commit and tag it at once; merge the workflow change first and let CI pass.

## 8. Dry run you can do today (publishes nothing)

Nothing here writes to npm or GitHub. It needs only Node 24 and the repository. It creates `dist-release/` (git-ignored); delete it afterwards.

```bash
npm ci
npm run check:versions                                        # check-versions: OK (5 package(s): ...)
node scripts/check-versions.js --tag aegis-skills@1.5.0       # name/dir/key/version/latest=true/prev_tag=
node scripts/check-versions.js --tag @aegis-skills/themis-plugin@1.1.0   # exits 1: "not releasable yet. Releasable packages: ..."
for d in themis-core themis-gateway themis-plugin themis-app; do npm run build --workspace "packages/$d" --if-present; done
node scripts/assert-pack.js all                               # five "assert-pack: OK ..." lines; the three releasable say "publish-ready"
rm -rf dist-release
for k in aegis themis-core themis-gateway; do node scripts/pack-to.js "$k" dist-release/npm; done
node scripts/build-release-assets.js --package aegis --out dist-release/assets --npm-tarball "$(ls dist-release/npm/aegis-skills-*.tgz)"
#   build-release-assets: 24 skill zips, 1 prompts bundle, 3 Gemini archives, 1 ChatGPT plugin bundle
#   build-release-assets: 31 file(s) incl. SHA256SUMS in dist-release/assets
(cd dist-release/assets && sha256sum -c SHA256SUMS | grep -vc ': OK$')    # 0
npm publish --dry-run --ignore-scripts --workspace packages/aegis        # lists the tarball, publishes nothing
npm run test:scripts && npx jest
rm -rf dist-release
```

What the assets are (sizes of the 2026-10-13 build): 24 skill zips (7 to 30 KB each, byte-identical to the website downloads), `aegis-prompts-1.5.0.zip` (278 KB), `darwin|linux|win32.aegis-skills.zip` (364 KB each, identical content: `gemini-extension.json`, `GEMINI.md`, README, licences, `skills/`), `aegis-chatgpt-plugin-1.5.0.zip` (568 KB, skills-only, no `mcp.json`), `aegis-skills-1.5.0.tgz` (289 KB) and `SHA256SUMS`.

## What only the first real run can prove

These are checked by tests as far as a laptop can, but only GitHub and npm can prove them: that the workflow files are accepted and each job passes on the hosted runners; that the `npm-publish` environment rules admit tag runs; that npm accepts OIDC from `release.yml` with the `setup-node` registry file present; that provenance is generated; that `gh release create --verify-tag` works with the notes file; that the Windows and macOS smoke jobs pass; that the npm settings pages match section 3.

## Manual release procedure (after the bootstrap; every later release)

```bash
git switch main && git pull --ff-only && git switch -c release/<name>-<version>
npm run bump -- <aegis|themis-core|themis-gateway> <patch|minor|major>      # note the TAG= line
git status --short && npm run check:versions
git add -A packages .claude-plugin listings docs apps/web/package.json package-lock.json
git commit -m "chore(release): <tag>"
git push -u origin HEAD && gh pr create --base main --fill && gh pr checks --watch
# merge the PR, then:
git switch main && git pull --ff-only
git tag -a "<tag>" -m "<tag>"
git push origin "refs/tags/<tag>"
```

For `themis-core` minor bumps, `bump-version` also raises the range in `themis-gateway`; release core first, then gateway. For an `aegis-skills` release, add `.github/release-notes/aegis-skills@<version>.md` in the same PR if you want hand-written notes; otherwise GitHub generates them.
