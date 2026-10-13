#!/usr/bin/env node
'use strict'
// Decides whether main holds intel-only changes that warrant an automatic aegis-skills patch release (decision D13).
// Prints release=, reason=, sha= and appends them to $GITHUB_OUTPUT (and a summary to $GITHUB_STEP_SUMMARY) when set.
// --require-release: exit 1 unless release=true.
// It only inspects what is committed; it never runs intel-sync and never reads .intel-sync-state.json.
const fs = require('fs')
const { execFileSync } = require('child_process')
const lib = require('./lib/release-manifests')

const AEGIS_DIR = 'packages/aegis'
// Files the intel-sync task and the health bot manage. Anything else under packages/aegis needs a human-chosen version.
const INTEL_RE = /^packages\/aegis\/(health\.json|\.intel-sync-state\.json|skills\/[a-z0-9-]+\/(references\/live-threat-intel\.md|intel-state\.json))$/
// Of those, the only files that ship in the npm package.
const SHIPPED_RE = /^packages\/aegis\/skills\/[a-z0-9-]+\/references\/live-threat-intel\.md$/
const git = args => execFileSync('git', args, { cwd: lib.ROOT, encoding: 'utf8' }).trim()

function latestAegisTag () {
  let best = null
  for (const t of git(['tag', '--list', 'aegis-skills@*']).split('\n').filter(Boolean)) {
    const v = lib.parse(t.slice('aegis-skills@'.length))
    if (v && (!best || lib.cmp(v, best.v) > 0)) best = { t, v }
  }
  return best
}

function decide () {
  const tag = latestAegisTag()
  if (!tag) return { release: false, reason: 'no aegis-skills@* tag yet; the first release is cut by hand' }
  const version = lib.readJson(`${AEGIS_DIR}/package.json`).data.version
  if (version !== tag.v.join('.')) return { release: false, reason: `${AEGIS_DIR}/package.json is ${version} but the newest tag is ${tag.t}; a manual release is in progress` }
  const changed = git(['diff', '--name-only', `${tag.t}..HEAD`, '--', AEGIS_DIR]).split('\n').filter(Boolean)
  if (!changed.length) return { release: false, reason: `nothing under ${AEGIS_DIR} changed since ${tag.t}` }
  const other = changed.filter(f => !INTEL_RE.test(f))
  if (other.length) return { release: false, reason: `non-intel changes since ${tag.t} need a human-chosen version (npm run bump -- aegis <patch|minor|major>): ${other.slice(0, 10).join(', ')}${other.length > 10 ? ', ...' : ''}` }
  const shipped = changed.filter(f => SHIPPED_RE.test(f))
  if (!shipped.length) return { release: false, reason: `only intel state changed since ${tag.t}; nothing that ships in the package changed` }
  return { release: true, reason: `${shipped.length} live-threat-intel file(s) changed since ${tag.t}` }
}

if (require.main === module) {
  const result = { ...decide(), sha: git(['rev-parse', 'HEAD']) }
  const lines = [`release=${result.release}`, `reason=${result.reason}`, `sha=${result.sha}`]
  console.log(lines.join('\n'))
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n')
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Aegis intel release\n\n- release: **${result.release}**\n- ${result.reason}\n`)
  if (process.argv.includes('--require-release') && !result.release) process.exit(1)
}

module.exports = { decide, INTEL_RE, SHIPPED_RE }
