#!/usr/bin/env node
'use strict'
// Fails (exit 1) when a manifest, lockfile entry, internal range, adapter pin or doc pin drifts from package.json,
// and when .claude-plugin/marketplace.json lists a plugin whose npm package is not releasable yet.
//   node scripts/check-versions.js             check the repo
//   node scripts/check-versions.js --tag <t>   also require tag <npm-name>@<X.Y.Z> to match and the package to be
//                                              RELEASABLE, then print name/dir/key/version/latest/prev_tag
//                                              (and append them to $GITHUB_OUTPUT)
const fs = require('fs')
const { execFileSync } = require('child_process')
const lib = require('./lib/release-manifests')

function collectProblems () {
  const problems = []
  const versions = {}
  for (const p of lib.presentPackages()) {
    const where = `${p.dir}/package.json`
    const pj = lib.readJson(where).data
    if (pj.name !== p.name) problems.push(`${where}: name is "${pj.name}", expected "${p.name}"`)
    if (!lib.parse(pj.version)) problems.push(`${where}: version "${pj.version}" is not X.Y.Z`)
    if (pj.private) problems.push(`${where}: a publishable package must not be "private"`)
    if (pj.license !== lib.LICENSE) problems.push(`${where}: license must be "${lib.LICENSE}"`)
    if (!pj.engines || pj.engines.node !== lib.ENGINES_NODE) problems.push(`${where}: engines.node must be "${lib.ENGINES_NODE}"`)
    const repo = pj.repository || {}
    const url = String(repo.url || '').replace(/^git\+/, '').replace(/\.git$/, '')
    if (url !== lib.REPO_URL || repo.directory !== p.dir) problems.push(`${where}: repository must be { "url": "${lib.REPO_URL}", "directory": "${p.dir}" } (npm provenance checks it)`)
    versions[p.name] = pj.version
    for (const m of p.manifests) {
      if (!lib.exists(m.file)) { if (!m.optional) problems.push(`${m.file}: missing (embeds the ${p.name} version)`); continue }
      for (const s of lib.slots(p, m, lib.readJson(m.file).data)) {
        if (s.missing) problems.push(`${m.file}: ${s.label} missing`)
        else if (s.value !== pj.version) problems.push(`${m.file}: ${s.label} is "${s.value}", expected "${pj.version}" (${p.name})`)
      }
    }
  }
  const lock = lib.exists('package-lock.json') ? lib.readJson('package-lock.json').data : null
  if (!lock) problems.push('package-lock.json: missing')
  for (const p of lib.presentPackages()) {
    const e = lock && lock.packages && lock.packages[p.dir]
    if (lock && !e) problems.push(`package-lock.json: no entry for "${p.dir}" (run npm install)`)
    else if (e && e.version !== versions[p.name]) problems.push(`package-lock.json: packages["${p.dir}"].version is "${e.version}", expected "${versions[p.name]}"`)
  }
  for (const dir of lib.dependentDirs()) {
    const pj = lib.readJson(`${dir}/package.json`).data
    const le = lock && lock.packages && lock.packages[dir]
    for (const field of lib.DEP_FIELDS) {
      for (const [dep, range] of Object.entries(pj[field] || {})) {
        if (!lib.isInternal(dep)) continue
        const where = `${dir}/package.json ${field}["${dep}"]`
        if (!(dep in versions)) { problems.push(`${where}: ${dep} does not exist in this repo`); continue }
        const why = lib.rangeProblem(range, versions[dep])
        if (why) problems.push(`${where}: ${why}`)
        if (le && le[field] && le[field][dep] !== undefined && le[field][dep] !== range) problems.push(`package-lock.json: packages["${dir}"].${field}["${dep}"] is "${le[field][dep]}", expected "${range}"`)
      }
    }
  }
  for (const f of lib.PIN_FILES) {
    if (!lib.exists(f)) continue
    for (const match of lib.findPins(fs.readFileSync(lib.abs(f), 'utf8'))) {
      const why = lib.pinProblem(match, versions)
      if (why) problems.push(`${f}: ${why}`)
    }
  }
  for (const f of lib.DOC_PIN_FILES) {
    if (!lib.exists(f)) continue
    for (const match of lib.findPins(fs.readFileSync(lib.abs(f), 'utf8'))) {
      const why = lib.pinProblem(match, versions, { lenient: true })
      if (why) problems.push(`${f}: ${why}`)
    }
  }
  for (const f of lib.DOC_TABLE_FILES) {
    if (!lib.exists(f)) continue
    const rows = lib.tableRows(fs.readFileSync(lib.abs(f), 'utf8'))
    for (const name of Object.keys(versions)) {
      if (!rows.some(r => r.name === name)) problems.push(`${f}: version table has no row for ${name}`)
    }
    for (const r of rows) {
      if (versions[r.name] && r.version !== versions[r.name]) problems.push(`${f}: version table says ${r.name} ${r.version}, expected ${versions[r.name]}`)
    }
  }
  problems.push(...lib.marketplaceProblems())
  return { problems, versions }
}

function tagInfo (tag, versions) {
  const m = /^(aegis-skills|@aegis-skills\/[a-z-]+)@(\d+\.\d+\.\d+)$/.exec(tag)
  if (!m) throw new Error(`tag "${tag}" is not <npm-name>@X.Y.Z`)
  const pkg = lib.PACKAGES.find(p => p.name === m[1])
  if (!pkg) throw new Error(`tag "${tag}" names no package in the release table`)
  if (!lib.isReleasable(pkg.name)) throw new Error(`${pkg.name} is not releasable yet. Releasable packages: ${lib.RELEASABLE.join(', ')}. Phase 8 widens the list.`)
  if (versions[pkg.name] !== m[2]) throw new Error(`tag ${tag} but ${pkg.dir}/package.json is ${versions[pkg.name]}`)
  const mine = lib.parse(m[2])
  const others = execFileSync('git', ['tag', '--list', `${pkg.name}@*`], { cwd: lib.ROOT, encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(Boolean)
    .map(t => ({ t, v: lib.parse(t.slice(pkg.name.length + 1)) })).filter(x => x.v)
  const older = others.filter(x => lib.cmp(x.v, mine) < 0).sort((a, b) => lib.cmp(b.v, a.v))
  const newer = others.some(x => lib.cmp(x.v, mine) > 0)
  return {
    name: pkg.name, dir: pkg.dir, key: pkg.key, version: m[2],
    latest: String(pkg.key === 'aegis' && !newer), prev_tag: older.length ? older[0].t : ''
  }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const { problems, versions } = collectProblems()
  if (problems.length) {
    console.error(`check-versions: ${problems.length} problem(s)`)
    problems.forEach(p => console.error(`  - ${p}`))
    process.exit(1)
  }
  const i = args.indexOf('--tag')
  if (i !== -1) {
    let info
    try { info = tagInfo(args[i + 1] || '', versions) } catch (e) { console.error(`check-versions: ${e.message}`); process.exit(1) }
    const lines = Object.entries(info).map(([k, v]) => `${k}=${v}`)
    console.log(lines.join('\n'))
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n')
  }
  console.log(`check-versions: OK (${Object.keys(versions).length} package(s): ${Object.entries(versions).map(([n, v]) => `${n}@${v}`).join(', ')})`)
}

module.exports = { collectProblems, tagInfo }
