#!/usr/bin/env node
'use strict'

/**
 * Layout guard for the Aegis/Themis monorepo (restructure Phase 0; later phases update the lists).
 *   node scripts/check-layout.js          files, git-tracked paths, package manifests
 *   node scripts/check-layout.js --trace  also the apps/web/.next trace files (after `next build`)
 * Prints every problem and exits 1 on failure.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const at = p => path.join(ROOT, p)
const problems = []

const MUST_EXIST = [
  'package.json', 'package-lock.json', 'jest.config.js', 'tsconfig.base.json',
  'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT', 'SECURITY.md', 'README.md',
  '.github/workflows/skill-health.yml', '.claude-plugin/marketplace.json',
  // Phase 7 part A: CI, release tooling, publish-ready packages
  '.github/workflows/ci.yml', '.github/dependabot.yml', 'scripts/ci-detect.js', 'scripts/assert-no-native.js',
  'scripts/lib/release-manifests.js', 'scripts/check-versions.js', 'scripts/bump-version.js', 'scripts/assert-pack.js', 'scripts/pack-to.js',
  'scripts/__tests__/release-manifests.test.js', 'scripts/__tests__/bump-version.test.js', 'scripts/__tests__/assert-pack.test.js', 'scripts/__tests__/workflows.test.js', 'scripts/tests/release-guard.test.js',
  // Phase 7 part B: release pipeline
  'scripts/lib/zip.js', 'scripts/lib/zip-read.js', 'scripts/lib/release-validate.js', 'scripts/build-chatgpt-bundle.js', 'scripts/build-release-assets.js', 'scripts/__tests__/release-assets.test.js', 'listings/chatgpt/plugin.json', 'listings/chatgpt/plugin-readme.md', 'listings/chatgpt/assets/logo.png', 'scripts/wait-for-deps.js', 'scripts/intel-release-check.js', 'scripts/__tests__/intel-release-check.test.js', 'scripts/__tests__/wait-for-deps.test.js', '.github/workflows/release.yml', '.github/workflows/intel-release.yml', '.github/release-notes/aegis-skills@1.5.0.md', '.github/release-notes/@aegis-skills__themis-core@0.1.0.md', '.github/release-notes/@aegis-skills__themis-gateway@0.1.0.md', 'docs/RELEASE-RUNBOOK.md',
  'packages/aegis/LICENSE', 'packages/aegis/LICENSE-APACHE', 'packages/aegis/LICENSE-MIT',
  'packages/themis-core/README.md', 'packages/themis-core/LICENSE', 'packages/themis-core/LICENSE-APACHE', 'packages/themis-core/LICENSE-MIT',
  'packages/themis-gateway/README.md', 'packages/themis-gateway/LICENSE', 'packages/themis-gateway/LICENSE-APACHE', 'packages/themis-gateway/LICENSE-MIT',
  'packages/themis-app/LICENSE', 'packages/themis-app/LICENSE-APACHE', 'packages/themis-app/LICENSE-MIT',
  'scripts/intel-sync.js', 'scripts/intel-routing.js', 'scripts/skill-health.js',
  'scripts/lint-skills.js', 'scripts/migrate-skill-frontmatter.js', 'scripts/build-flat-prompts.js', 'scripts/sync-skill-tokens.js',
  'packages/aegis/package.json', 'packages/aegis/health.json', 'packages/aegis/skills',
  'apps/web/package.json', 'apps/web/next.config.js', 'apps/web/vercel.json', 'apps/web/jest.config.js', 'apps/web/jest.setup.js', 'apps/web/jest.global-setup.js',
  'apps/web/tsconfig.json', 'apps/web/next-env.d.ts', 'apps/web/postcss.config.js', 'apps/web/tailwind.config.js',
  'apps/web/lib/aegis.js', 'apps/web/lib/site-paths.js', 'apps/web/lib/zip.js', 'apps/web/lib/downloads.js', 'apps/web/lib/flat-prompt.js',
  'apps/web/lib/install-commands.js', 'apps/web/lib/markdown.js', 'apps/web/lib/docs.js', 'apps/web/lib/skill-page.js',
  'apps/web/scripts/build-downloads.js', 'apps/web/scripts/sync-design-tokens.js',
  'apps/web/pages/_document.js', 'apps/web/pages/skills/index.js', 'apps/web/pages/skills/[name].js', 'apps/web/pages/paths.js', 'apps/web/pages/themis.js', 'apps/web/pages/mcp.js',
  'apps/web/pages/docs/index.js', 'apps/web/pages/docs/[...slug].js', 'apps/web/pages/security.js', 'apps/web/pages/license.js',
  'packages/aegis/cli/aegis.js', 'packages/aegis/lib/installer.js',
  'packages/aegis/mcp/server.js', 'packages/aegis/mcp/stdio.js', 'packages/aegis/mcp/skill-reader.js',
  'packages/aegis/mcp/skill-families.js', 'packages/aegis/lib/skill-meta.js', 'packages/aegis/lib/targets.js',
  'packages/aegis/lib/config-writers.js', 'packages/aegis/lib/ledger.js',
  'apps/web/app/api/mcp/route.ts', 'apps/web/app/.well-known/openai-apps-challenge/route.ts', 'apps/web/lib/rate-limit.ts', 'apps/web/lib/openai-challenge.ts', 'apps/web/config/openai-apps-challenge.txt', 'apps/web/__tests__/rate-limit.test.ts', 'apps/web/pages/index.js', 'apps/web/components/Layout.js',
  'apps/web/styles/globals.css', 'packages/aegis/tests/mcp-server.test.js',
  'scripts/tests/fixtures/legacy/test-skill/SKILL.md',
  // Phase 2: deterministic engine + governed MCP client extracted from the web app
  'packages/themis-core/package.json', 'packages/themis-core/tsconfig.build.json', 'packages/themis-core/jest.config.js', 'packages/themis-core/src/index.ts',
  'packages/themis-gateway/package.json', 'packages/themis-gateway/tsconfig.build.json', 'packages/themis-gateway/jest.config.js',
  'packages/themis-gateway/src/index.ts', 'packages/themis-gateway/src/client.ts', 'packages/themis-gateway/src/gateway.ts',
  'scripts/check-deps-themis.js', 'scripts/check-registry-meta.js', 'scripts/tests/check-registry-meta.test.js', 'scripts/build-themis-packages.js',
  'packages/themis-app/package.json', 'packages/themis-app/bin/themis.js',
  'packages/themis-app/tsconfig.build.json', 'packages/themis-app/jest.config.js', 'packages/themis-app/README.md', 'docs/themis/mode-2-app.md',
  'docs/aegis/index.md', 'docs/aegis/install.md', 'docs/aegis/single-file-prompts.md', 'docs/aegis/mcp.md', 'docs/aegis/cli.md', 'docs/aegis/skill-format.md', 'docs/aegis/intel.md',
  'docs/themis/index.md', 'docs/themis/mode-1-plugin.md', 'docs/themis/governance.md', 'docs/themis/workflow.md', 'docs/themis/configuration.md', 'docs/themis/versions.md', 'docs/themis/compliance-mapping.md',
  'docs/themis/threat-model-atlas.md', 'docs/themis/dual-use-review.md', 'docs/listings/listing-copy.md', 'docs/listings/anthropic-plugin.md', 'docs/listings/anthropic-connectors.md', 'docs/listings/chatgpt-app.md', 'docs/listings/gemini-gallery.md', 'docs/listings/mcp-registry.md', 'docs/listings/README.md', 'scripts/check-plugin-bundle.js', 'scripts/tests/check-plugin-bundle.test.js', 'scripts/tests/listing-copy.test.js', 'packages/themis-plugin/LICENSE', 'packages/themis-plugin/LICENSE-MIT', 'packages/themis-plugin/LICENSE-APACHE', 'docs/themis/privacy-policy.md', 'docs/themis/test-prompts.md',
  'docs/themis/compliance/README.md', 'docs/themis/compliance/owasp-llm.md', 'docs/themis/compliance/owasp-agentic.md', 'docs/themis/compliance/nist-ai-rmf.md',
  'docs/aegis/hosted-mcp.md', 'packages/themis-plugin/README.md',
  'packages/themis-app/src/index.ts', 'packages/themis-app/src/app.ts', 'packages/themis-app/src/cli/index.ts',
  'packages/themis-app/src/graph/build.ts', 'packages/themis-app/src/runner/runner.ts', 'packages/themis-app/src/store/checkpointer.ts',
  'packages/themis-app/src/server/http.ts', 'packages/themis-app/src/server/security.ts', 'packages/themis-app/src/server/routes/approvals.ts',
  'packages/themis-app/ui/index.html', 'packages/themis-app/ui/src/theme.ts', 'packages/themis-app/ui/public/theme-init.v1.js', 'docs/design/ADOPTION.md', 'packages/themis-app/ui/vite.config.mts', 'packages/themis-app/ui/tsconfig.json', 'packages/themis-app/ui/src/main.tsx',
  // Phase 3: Mode 1 plugin (Themis on the user's own AI)
  'packages/themis-plugin/package.json', 'packages/themis-plugin/tsconfig.build.json', 'packages/themis-plugin/jest.config.js',
  'packages/themis-plugin/src/index.ts', 'packages/themis-plugin/src/server.ts', 'packages/themis-plugin/src/approval.ts',
  'packages/themis-plugin/src/tools/workflow-tools.ts', 'packages/themis-plugin/src/tools/capability-tools.ts', 'packages/themis-plugin/src/tools/gateway-tools.ts',
  'packages/themis-plugin/skills/themis-orchestrator/SKILL.md', 'packages/themis-plugin/skills/themis-orchestrator/skill.json',
  'packages/themis-plugin/agents/themis-subtask-runner.md', 'packages/themis-plugin/agents/themis-guardrail-reviewer.md',
  'packages/themis-plugin/.claude-plugin/plugin.json', 'packages/themis-plugin/.mcp.json', 'packages/themis-plugin/server.json',
  'packages/themis-plugin/docs/manual-verification.md',
  // Design language (tokens, generator, spec docs)
  'design/tokens.json', 'design/tokens.css', 'design/build-tokens.js', 'design/tokens.test.js', 'design/jest.config.js',
  'docs/design/DESIGN.md', 'docs/design/motion.md',
  'docs/design/research/hermes-agent.md', 'docs/design/research/nousresearch.md', 'docs/design/research/microsoft-ai.md', 'docs/design/research/humanistreview.md',
  // Brand: logos, favicon set, social image, masters, docs
  'apps/web/components/Brand.js', 'apps/web/tests/pages/brand-images.test.js', 'scripts/tests/naming.test.js',
  'apps/web/public/favicon.svg', 'apps/web/public/favicon.ico', 'apps/web/public/apple-touch-icon.png', 'apps/web/public/og.png',
  'apps/web/public/brand/aegis-icon.svg', 'apps/web/public/brand/themis-icon.svg',
  'apps/web/public/brand/aegis-mark-640.webp', 'apps/web/public/brand/aegis-mark-320.webp', 'apps/web/public/brand/aegis-lockup-640.webp',
  'apps/web/public/brand/themis-mark-640.webp', 'apps/web/public/brand/themis-mark-320.webp', 'apps/web/public/brand/themis-lockup-640.webp',
  'design/brand/source/aegis-mark.png', 'design/brand/source/aegis-lockup.png', 'design/brand/source/aegis-tile.webp',
  'design/brand/source/themis-mark.png', 'design/brand/source/themis-lockup.png', 'design/brand/source/themis-tile.webp',
  'docs/design/LOGOS.md', 'docs/design/FONTS.md', 'apps/web/public/fonts/OFL-RedHatMono.txt', 'apps/web/public/fonts/red-hat-mono-latin-400-normal.woff2', 'apps/web/public/fonts/red-hat-mono-latin-500-normal.woff2', 'apps/web/tests/guard/fonts-guard.test.js',
  // Design review (2026-10): quick start, trust and data flow, worked example, readability guard
  'apps/web/pages/quickstart.js', 'apps/web/pages/trust.js', 'docs/trust/data-flow.md',
  'apps/web/components/FlowDiagram.js', 'apps/web/components/AegisThemisFlow.js',
  'apps/web/lib/captured-mcp.js', 'apps/web/lib/version-stamp-sample.js',
  'apps/web/tests/pages/new-pages.render.test.js', 'apps/web/tests/guard/trust-claims.test.js',
  'apps/web/tests/guard/readability-css.test.js', 'apps/web/tests/lib/captured-mcp.test.js',
  // Themis dashboard brand: favicon with cream plate (icons come from apps/web/public/brand via the @brand alias)
  'packages/themis-app/ui/public/favicon.svg',
  // Launch (2026-10-12): terms of service (single source rendered at /terms; kept out of the docs hub)
  'docs/legal/terms.md', 'apps/web/pages/terms.js', 'apps/web/tests/pages/terms.render.test.js',
  // Themis in-development markers
  'apps/web/components/StatusPill.js', 'apps/web/tests/components/StatusPill.test.js', 'apps/web/tests/pages/in-development.render.test.js',
  // Launch basics: deploy notes, robots, sitemap generator, 404, per-page meta
  'docs/DEPLOY.md', 'apps/web/public/robots.txt', 'apps/web/scripts/build-sitemap.js', 'apps/web/lib/site-url.js', 'apps/web/pages/404.js',
  'apps/web/tests/lib/sitemap.test.js', 'apps/web/tests/pages/page-meta.test.js'
]
const MUST_NOT_EXIST = [
  'skills', 'lib', 'src', 'app', 'pages', 'components', 'styles', 'bin', 'supabase', 'tests', '__tests__',
  'health.json', '.intel-sync-state.json', 'next.config.js', 'tsconfig.json', 'postcss.config.js',
  'tailwind.config.js', 'jest.setup.js', 'next-env.d.ts', 'run-supply-chain-fix.js', '.npmignore', 'tsconfig.tsbuildinfo',
  // Phase 2: these moved into packages/themis-core and packages/themis-gateway
  'apps/web/lib/themis/types.ts', 'apps/web/lib/themis/secrets.ts', 'apps/web/lib/themis/sanitise.ts',
  'apps/web/lib/themis/mcp/config.ts', 'apps/web/lib/themis/mcp/tool-policy.ts', 'apps/web/lib/themis/mcp/client.ts',
  'apps/web/lib/themis/audit/types.ts', 'apps/web/lib/themis/audit/scorer.ts', 'apps/web/lib/themis/audit/standards.ts',
  'apps/web/lib/themis/exposure/types.ts', 'apps/web/lib/themis/exposure/policy.ts', 'apps/web/lib/themis/exposure/risk.ts',
  'apps/web/lib/themis/exposure/detection.ts', 'apps/web/lib/themis/exposure/verify.ts', 'apps/web/lib/themis/exposure/capabilities.ts',
  'apps/web/__tests__/themis/secrets.test.ts', 'apps/web/__tests__/themis/sanitise.test.ts', 'apps/web/__tests__/themis/types.test.ts',
  'apps/web/__tests__/themis/mcp/governance.test.ts',
  // Phase 4: Themis left apps/web entirely
  'apps/web/lib/themis', 'apps/web/__tests__/themis', 'apps/web/app/api/themis', 'apps/web/app/api/audit', 'apps/web/app/api/exposure', 'apps/web/supabase',
  // Phase 5: replaced by pages/docs/ (hub rendered from repository markdown)
  'apps/web/pages/docs.js',
  // Phase 5: retired; the docs hub supersedes it
  'docs/TECHNICAL.md',
  // Brand: the 300 KB PNG masters live in design/brand/source; the site ships optimised WebP only
  'apps/web/public/brand/aegis-mark.png', 'apps/web/public/brand/aegis-lockup.png', 'apps/web/public/brand/themis-mark.png', 'apps/web/public/brand/themis-lockup.png',
  'apps/web/public/brand/aegis-tile.webp', 'apps/web/public/brand/themis-tile.webp'
]
const TRACKED_TOP = new Set([
  '.claude', '.claude-plugin', '.github', '.gitattributes', '.gitignore', '.npmrc', 'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT', 'SECURITY.md',
  'README.md', 'package.json', 'package-lock.json', 'jest.config.js', 'tsconfig.base.json',
  'apps', 'packages', 'scripts', 'docs', 'design', 'listings'
])
const PACKAGES = [
  ['package.json', 'aegis-skills-monorepo'],
  ['apps/web/package.json', '@aegis-skills/web'],
  ['packages/aegis/package.json', 'aegis-skills'],
  ['packages/themis-core/package.json', '@aegis-skills/themis-core'],
  ['packages/themis-gateway/package.json', '@aegis-skills/themis-gateway'],
  ['packages/themis-plugin/package.json', '@aegis-skills/themis-plugin'],
  ['packages/themis-app/package.json', '@aegis-skills/themis']
]

for (const p of MUST_EXIST) if (!fs.existsSync(at(p))) problems.push(`missing: ${p}`)
for (const p of MUST_NOT_EXIST) if (fs.existsSync(at(p))) problems.push(`should have moved: ${p}`)

const skillsDir = at('packages/aegis/skills')
const skills = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
  : []
if (skills.length !== 24) problems.push(`expected 24 skills in packages/aegis/skills, found ${skills.length}`)
for (const s of skills) {
  for (const f of ['SKILL.md', 'skill.json']) {
    if (!fs.existsSync(path.join(skillsDir, s, f))) problems.push(`missing: packages/aegis/skills/${s}/${f}`)
  }
}

const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
const stray = tracked.filter(f => !TRACKED_TOP.has(f.split('/')[0]))
for (const f of stray.slice(0, 20)) problems.push(`unexpected tracked path: ${f}`)
if (stray.length > 20) problems.push(`…and ${stray.length - 20} more unexpected tracked paths`)
if (tracked.some(f => f.startsWith('graphify-out/'))) problems.push('graphify-out/ must not be tracked')

for (const [file, name] of PACKAGES) {
  let j = {}
  try { j = JSON.parse(fs.readFileSync(at(file), 'utf8')) } catch (e) { problems.push(`unreadable: ${file}`); continue }
  if (j.name !== name) problems.push(`${file}: name should be ${name}, is ${j.name}`)
  if (j.license !== '(Apache-2.0 OR MIT)') problems.push(`${file}: license should be (Apache-2.0 OR MIT)`)
  if (!j.engines || j.engines.node !== '>=24') problems.push(`${file}: engines.node should be >=24`)
  if (file === 'package.json') {
    if (j.private !== true) problems.push('root package.json must be private')
    if (JSON.stringify(j.workspaces) !== JSON.stringify(['packages/*', 'apps/*'])) problems.push('root workspaces must be ["packages/*","apps/*"]')
  }
}

const trace = process.argv.includes('--trace')
if (trace) {
  const WANT = ['packages/aegis/skills/mitre-attack/SKILL.md', 'packages/aegis/skills/mitre-attack/skill.json', 'packages/aegis/package.json']
  for (const t of ['pages/index.js', 'pages/api/skills.js', 'app/api/mcp/route.js']) {
    const f = at(`apps/web/.next/server/${t}.nft.json`)
    if (!fs.existsSync(f)) { problems.push(`missing trace file: apps/web/.next/server/${t}.nft.json`); continue }
    const files = JSON.parse(fs.readFileSync(f, 'utf8')).files.map(x => x.replace(/\\/g, '/'))
    for (const w of WANT) if (!files.some(x => x.endsWith(w))) problems.push(`${t}.nft.json does not include ${w}`)
    if (!files.some(x => /packages\/aegis\/skills\/[^/]+\/references\/[^/]+\.md$/.test(x))) problems.push(`${t}.nft.json includes no references/*.md`)
  }
}

if (problems.length) {
  console.error(`Layout check FAILED (${problems.length}):`)
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
console.log(`Layout check passed${trace ? ' (with trace)' : ''}: ${skills.length} skills, ${tracked.length} tracked files.`)
