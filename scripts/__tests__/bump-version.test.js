'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const SCRIPTS = path.join(__dirname, '..')
const PKG = (dir, name, version, extra = {}) => ({
  name, version, license: '(Apache-2.0 OR MIT)', engines: { node: '>=24' },
  repository: { type: 'git', url: 'git+https://github.com/drupadsachania/aegis-skills.git', directory: dir }, ...extra
})

// Hand-formatted JSON (inline arrays, CRLF in one file) so the tests prove that bumps do not reformat files.
function fixture ({ withThemisPlugin = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-rel-'))
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), text)
  }
  const w = (rel, obj) => put(rel, JSON.stringify(obj, null, 2) + '\n')
  const appDeps = { 'aegis-skills': '^1.1.0', '@aegis-skills/themis-core': '^0.1.0' }
  w('packages/aegis/package.json', PKG('packages/aegis', 'aegis-skills', '1.1.0'))
  w('packages/aegis/.claude-plugin/plugin.json', { name: 'aegis', version: '1.1.0' })
  put('packages/aegis/gemini-extension.json', '{\r\n  "name": "aegis-skills",\r\n  "version": "1.1.0",\r\n  "mcpServers": { "aegis": { "command": "npx", "args": ["-y", "aegis-skills@1.1.0", "mcp"] } }\r\n}\r\n')
  w('packages/aegis/server.json', { name: 'io.github.drupadsachania/aegis-skills', version: '1.1.0', packages: [{ registryType: 'npm', identifier: 'aegis-skills', version: '1.1.0', transport: { type: 'stdio' } }] })
  const plugins = [{ name: 'aegis', source: './packages/aegis', version: '1.1.0' }]
  if (withThemisPlugin) {
    plugins.push({ name: 'themis', source: './packages/themis-plugin', version: '0.1.0' })
    w('packages/themis-plugin/package.json', PKG('packages/themis-plugin', '@aegis-skills/themis-plugin', '0.1.0'))
    w('packages/themis-plugin/.claude-plugin/plugin.json', { name: 'themis', version: '0.1.0' })
    w('packages/themis-plugin/.mcp.json', { mcpServers: { themis: { command: 'npx', args: ['-y', '@aegis-skills/themis-plugin@0.1.0'] } } })
  }
  w('.claude-plugin/marketplace.json', { name: 'aegis-skills', plugins })
  w('packages/themis-core/package.json', PKG('packages/themis-core', '@aegis-skills/themis-core', '0.1.0'))
  w('packages/themis-app/package.json', PKG('packages/themis-app', '@aegis-skills/themis', '0.1.0', { dependencies: { ...appDeps } }))
  w('apps/web/package.json', { name: '@aegis-skills/web', version: '1.0.0', private: true, dependencies: { 'aegis-skills': '1.1.0' } })
  put('docs/themis/versions.md', '| Package | Version |\n|---|---|\n| `aegis-skills` | 1.1.0 (osk 1.1) |\n| `@aegis-skills/themis-core` | 0.1.0 |\n| `@aegis-skills/themis` | 0.1.0 |\n\nPinned as `aegis-skills@1.1.0`.\n')
  if (withThemisPlugin) fs.appendFileSync(path.join(root, 'docs/themis/versions.md'), '| `@aegis-skills/themis-plugin` | 0.1.0 |\n')
  const lockPkgs = {
    '': { name: 'aegis-skills-monorepo' },
    'packages/aegis': { name: 'aegis-skills', version: '1.1.0' },
    'packages/themis-core': { name: '@aegis-skills/themis-core', version: '0.1.0' },
    'packages/themis-app': { name: '@aegis-skills/themis', version: '0.1.0', dependencies: { ...appDeps } },
    'apps/web': { name: '@aegis-skills/web', version: '1.0.0', dependencies: { 'aegis-skills': '1.1.0' } }
  }
  if (withThemisPlugin) lockPkgs['packages/themis-plugin'] = { name: '@aegis-skills/themis-plugin', version: '0.1.0' }
  w('package-lock.json', { name: 'aegis-skills-monorepo', lockfileVersion: 3, packages: lockPkgs })
  spawnSync('git', ['init', '-q'], { cwd: root })
  return root
}
const run = (root, script, args = []) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args],
  { env: { ...process.env, AEGIS_RELEASE_ROOT: root, GITHUB_OUTPUT: '' }, encoding: 'utf8' })
const text = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const read = (root, rel) => JSON.parse(text(root, rel))

test('check-versions passes on a consistent fixture', () => {
  const r = run(fixture(), 'check-versions.js')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /check-versions: OK \(3 package\(s\)/)
})

test('aegis patch updates every manifest, pin, doc and lockfile entry, but not themis ranges', () => {
  const root = fixture()
  const r = run(root, 'bump-version.js', ['aegis', 'patch'])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^TAG=aegis-skills@1\.1\.1$/m)
  assert.equal(read(root, 'packages/aegis/package.json').version, '1.1.1')
  assert.equal(read(root, 'packages/aegis/.claude-plugin/plugin.json').version, '1.1.1')
  const gem = read(root, 'packages/aegis/gemini-extension.json')
  assert.equal(gem.version, '1.1.1')
  assert.equal(gem.mcpServers.aegis.args[1], 'aegis-skills@1.1.1')
  const server = read(root, 'packages/aegis/server.json')
  assert.deepEqual([server.version, server.packages[0].version], ['1.1.1', '1.1.1'])
  assert.equal(read(root, '.claude-plugin/marketplace.json').plugins[0].version, '1.1.1')
  assert.equal(read(root, 'package-lock.json').packages['packages/aegis'].version, '1.1.1')
  assert.equal(read(root, 'packages/themis-app/package.json').dependencies['aegis-skills'], '^1.1.0')
  assert.equal(read(root, 'apps/web/package.json').dependencies['aegis-skills'], '1.1.1')
  assert.equal(read(root, 'package-lock.json').packages['apps/web'].dependencies['aegis-skills'], '1.1.1')
  assert.match(text(root, 'docs/themis/versions.md'), /\| `aegis-skills` \| 1\.1\.1 \(osk 1\.1\) \|/)
  assert.match(text(root, 'docs/themis/versions.md'), /`aegis-skills@1\.1\.1`/)
  assert.equal(run(root, 'check-versions.js').status, 0)
})

test('a bump only changes version strings: formatting and CRLF are untouched', () => {
  const root = fixture()
  const before = text(root, 'packages/aegis/gemini-extension.json')
  assert.equal(run(root, 'bump-version.js', ['aegis', 'patch']).status, 0)
  const after = text(root, 'packages/aegis/gemini-extension.json')
  assert.equal(after, before.replace('"version": "1.1.0"', '"version": "1.1.1"').replace('aegis-skills@1.1.0', 'aegis-skills@1.1.1'))
})

test('--dry-run reports the change and leaves every file as it was', () => {
  const root = fixture()
  const files = ['packages/aegis/package.json', 'packages/aegis/gemini-extension.json', 'package-lock.json', 'docs/themis/versions.md']
  const before = files.map(f => text(root, f))
  const r = run(root, 'bump-version.js', ['aegis', 'minor', '--dry-run'])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /aegis-skills 1\.1\.0 -> 1\.2\.0 \(dry run\)/)
  assert.match(r.stdout, /would update packages\/aegis\/package\.json/)
  assert.deepEqual(files.map(f => text(root, f)), before)
})

test('a 0.x minor bump rewrites dependent ranges in package.json and the lockfile', () => {
  const root = fixture()
  const r = run(root, 'bump-version.js', ['themis-core', 'minor'])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(read(root, 'packages/themis-core/package.json').version, '0.2.0')
  assert.equal(read(root, 'packages/themis-app/package.json').dependencies['@aegis-skills/themis-core'], '^0.2.0')
  const lock = read(root, 'package-lock.json')
  assert.equal(lock.packages['packages/themis-core'].version, '0.2.0')
  assert.equal(lock.packages['packages/themis-app'].dependencies['@aegis-skills/themis-core'], '^0.2.0')
  assert.match(text(root, 'docs/themis/versions.md'), /\| `@aegis-skills\/themis-core` \| 0\.2\.0 \|/)
})

test('an aegis major bump moves dependents to the new major', () => {
  const root = fixture()
  const r = run(root, 'bump-version.js', ['aegis-skills', 'major'])
  assert.equal(r.status, 0, r.stderr)
  assert.equal(read(root, 'packages/themis-app/package.json').dependencies['aegis-skills'], '^2.0.0')
  assert.equal(read(root, 'packages/aegis/gemini-extension.json').mcpServers.aegis.args[1], 'aegis-skills@2.0.0')
})

test('drift is reported and blocks bumping', () => {
  const root = fixture()
  const f = path.join(root, 'packages/aegis/server.json')
  const s = JSON.parse(fs.readFileSync(f, 'utf8'))
  s.packages[0].version = '1.0.9'
  fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n')
  const c = run(root, 'check-versions.js')
  assert.equal(c.status, 1)
  assert.match(c.stderr, /server\.json: packages\[0\]\.version is "1\.0\.9", expected "1\.1\.0"/)
  assert.equal(run(root, 'bump-version.js', ['aegis', 'patch']).status, 1)
})

test('a range pin or a stale doc table row is drift', () => {
  const root = fixture()
  fs.writeFileSync(path.join(root, 'packages/aegis/gemini-extension.json'), text(root, 'packages/aegis/gemini-extension.json').replace('aegis-skills@1.1.0', 'aegis-skills@^1'))
  assert.match(run(root, 'check-versions.js').stderr, /must be an exact pin: aegis-skills@1\.1\.0/)
  const root2 = fixture()
  fs.writeFileSync(path.join(root2, 'docs/themis/versions.md'), text(root2, 'docs/themis/versions.md').replace('| 0.1.0 |\n| `@aegis-skills/themis`', '| 0.0.9 |\n| `@aegis-skills/themis`'))
  assert.match(run(root2, 'check-versions.js').stderr, /version table says @aegis-skills\/themis-core 0\.0\.9, expected 0\.1\.0/)
})

test('marketplace guard: a listed plugin whose npm package is not releasable fails the check', () => {
  const ok = fixture({ withThemisPlugin: true })
  const listed = JSON.parse(text(ok, '.claude-plugin/marketplace.json'))
  assert.equal(listed.plugins.length, 2)
  const r = run(ok, 'check-versions.js')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /plugin "themis" ships @aegis-skills\/themis-plugin, which is not releasable yet/)
  assert.match(r.stderr, /plugin "themis" launches @aegis-skills\/themis-plugin, which is not releasable yet/)
  // Unlisted: the same plugin folder is fine (only the marketplace listing is guarded).
  const unlisted = fixture({ withThemisPlugin: true })
  const m = JSON.parse(text(unlisted, '.claude-plugin/marketplace.json'))
  m.plugins = m.plugins.filter(p => p.name === 'aegis')
  fs.writeFileSync(path.join(unlisted, '.claude-plugin/marketplace.json'), JSON.stringify(m, null, 2) + '\n')
  const r2 = run(unlisted, 'check-versions.js')
  assert.equal(r2.status, 0, r2.stderr)
})

test('--tag resolves releasable packages and refuses the others with a clear message', () => {
  const root = fixture()
  const ok = run(root, 'check-versions.js', ['--tag', 'aegis-skills@1.1.0'])
  assert.equal(ok.status, 0, ok.stderr)
  assert.match(ok.stdout, /^latest=true$/m)
  assert.equal(run(root, 'check-versions.js', ['--tag', '@aegis-skills/themis-core@0.1.0']).stdout.includes('latest=false'), true)
  const no = run(root, 'check-versions.js', ['--tag', '@aegis-skills/themis@0.1.0'])
  assert.equal(no.status, 1)
  assert.match(no.stderr, /@aegis-skills\/themis is not releasable yet/)
  assert.equal(run(root, 'check-versions.js', ['--tag', 'aegis-skills@1.2.0']).status, 1)
})
