#!/usr/bin/env node
'use strict'
// The only supported way to change a package version. Rewrites package.json, every manifest that embeds
// the version, dependents' ranges that no longer accept it, npx pins, doc pins and package-lock.json
// (editing only the version strings, never reformatting a file), then re-runs the drift check.
//   node scripts/bump-version.js <aegis|themis-core|themis-gateway|themis-plugin|themis|npm-name> <patch|minor|major|X.Y.Z> [--commit] [--dry-run]
//   --dry-run: do everything, run the drift check on the result, then restore every file. Prints what would change.
//   --commit:  git add the changed files, commit "chore(release): <tag>" and create annotated tag <tag> (no push).
const fs = require('fs')
const { execFileSync } = require('child_process')
const lib = require('./lib/release-manifests')
const { collectProblems } = require('./check-versions')

function fail (msg, code = 1) { console.error(`bump-version: ${msg}`); process.exit(code) }
const git = args => execFileSync('git', args, { cwd: lib.ROOT, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' })

function main () {
  const args = process.argv.slice(2)
  const commit = args.includes('--commit')
  const dryRun = args.includes('--dry-run')
  const pos = args.filter(a => !a.startsWith('--'))
  if (pos.length !== 2) fail('usage: node scripts/bump-version.js <package> <patch|minor|major|X.Y.Z> [--commit] [--dry-run]', 2)
  if (commit && dryRun) fail('--commit and --dry-run cannot be combined', 2)
  const pkg = lib.findPackage(pos[0])
  if (!pkg) fail(`unknown package "${pos[0]}"`, 2)
  if (!lib.exists(`${pkg.dir}/package.json`)) fail(`${pkg.dir}/package.json does not exist`, 2)

  const before = collectProblems().problems
  if (before.length) fail(`the repo already has version drift; fix it first (npm run check:versions):\n  - ${before.join('\n  - ')}`)
  if (commit) { try { git(['diff', '--cached', '--quiet']) } catch { fail('the git index has staged changes; commit or unstage them first') } }

  const current = lib.readJson(`${pkg.dir}/package.json`).data.version
  let next
  try { next = lib.nextVersion(current, pos[1]) } catch (e) { fail(e.message, 2) }
  const tag = `${pkg.name}@${next}`
  if (commit && git(['tag', '--list', tag]).trim()) fail(`tag ${tag} already exists`)

  const original = new Map() // file -> original text
  const changed = new Set()
  const read = file => { if (!original.has(file)) original.set(file, fs.readFileSync(lib.abs(file), 'utf8')); return fs.readFileSync(lib.abs(file), 'utf8') }
  const write = (file, text) => { read(file); if (text !== fs.readFileSync(lib.abs(file), 'utf8')) { fs.writeFileSync(lib.abs(file), text); changed.add(file) } }
  const setJson = (file, edits) => { if (edits.length) write(file, lib.setStrings(read(file), edits)) }

  const restore = () => { for (const [file, text] of original) fs.writeFileSync(lib.abs(file), text) }
  try {
    setJson(`${pkg.dir}/package.json`, [{ path: ['version'], value: next }])
    for (const m of pkg.manifests) {
      if (!lib.exists(m.file)) continue
      const edits = []
      for (const s of lib.slots(pkg, m, JSON.parse(read(m.file)))) {
        if (s.missing) throw new Error(`${m.file}: ${s.label} missing`)
        edits.push({ path: s.path, value: next })
      }
      setJson(m.file, edits)
    }
    const rangeChanges = []
    for (const dir of lib.dependentDirs()) {
      const file = `${dir}/package.json`
      const data = JSON.parse(read(file))
      const edits = []
      for (const field of lib.DEP_FIELDS) {
        const deps = data[field]
        if (!deps || !(pkg.name in deps)) continue
        const range = lib.rangeAfterBump(deps[pkg.name], next)
        if (range === null) continue
        edits.push({ path: [field, pkg.name], value: range })
        rangeChanges.push({ dir, field, range })
      }
      setJson(file, edits)
    }
    for (const f of [...lib.PIN_FILES, ...lib.DOC_PIN_FILES]) {
      if (lib.exists(f)) write(f, lib.rewritePins(read(f), pkg.name, next))
    }
    for (const f of lib.DOC_TABLE_FILES) {
      if (lib.exists(f)) write(f, lib.rewriteTable(read(f), pkg.name, next))
    }
    if (lib.exists('package-lock.json')) {
      const lock = JSON.parse(read('package-lock.json'))
      const edits = []
      if (lock.packages && lock.packages[pkg.dir]) edits.push({ path: ['packages', pkg.dir, 'version'], value: next })
      for (const c of rangeChanges) {
        const le = lock.packages && lock.packages[c.dir]
        if (le && le[c.field] && pkg.name in le[c.field]) edits.push({ path: ['packages', c.dir, c.field, pkg.name], value: c.range })
      }
      setJson('package-lock.json', edits)
    }

    const after = collectProblems().problems
    if (after.length) throw new Error(`drift after bump:\n  - ${after.join('\n  - ')}`)
  } catch (e) {
    restore()
    fail(`${e.message}\n(every file was restored)`)
  }

  console.log(`bump-version: ${pkg.name} ${current} -> ${next}${dryRun ? ' (dry run)' : ''}`)
  ;[...changed].sort().forEach(f => console.log(`  ${dryRun ? 'would update' : 'updated'} ${f}`))
  if (dryRun) { restore(); console.log('bump-version: dry run, every file restored') }
  if (commit) {
    git(['add', '--', ...changed])
    git(['commit', '-q', '-m', `chore(release): ${tag}`])
    git(['tag', '-a', tag, '-m', tag])
    console.log(`bump-version: committed and tagged ${tag} (not pushed)`)
  }
  console.log(`TAG=${tag}`)
}

main()
