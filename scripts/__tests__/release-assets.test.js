'use strict'
// Builds the real Aegis release assets into a temp dir and re-opens every ZIP with scripts/lib/zip-read.js.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const lib = require('../lib/release-manifests')
const { createZip } = require('../lib/zip')
const { readZip } = require('../lib/zip-read')
const V = require('../lib/release-validate')
const { buildAssets } = require('../build-release-assets')

const version = lib.readJson('packages/aegis/package.json').data.version
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-assets-'))
const out = path.join(tmp, 'assets')
const fakeTgz = path.join(tmp, `aegis-skills-${version}.tgz`)
fs.writeFileSync(fakeTgz, 'not a real tarball')
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }))

const aegis = lib.findPackage('aegis')
const zipAt = name => readZip(fs.readFileSync(path.join(out, name)))
let built
test('build the Aegis assets', () => { built = buildAssets({ pkg: aegis, out, npmTarball: fakeTgz }); assert.ok(built.names.includes('SHA256SUMS')) })

test('asset names are exactly the documented set', () => {
  const skills = fs.readdirSync(lib.abs('packages/aegis/skills'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
  const want = [
    ...skills.map(s => `aegis-skill-${s}-${version}.zip`), `aegis-prompts-${version}.zip`, `aegis-chatgpt-plugin-${version}.zip`,
    'darwin.aegis-skills.zip', 'linux.aegis-skills.zip', 'win32.aegis-skills.zip', path.basename(fakeTgz), 'SHA256SUMS'
  ].sort()
  assert.deepEqual([...built.names].sort(), want)
  for (const n of built.names) assert.match(n, /^[A-Za-z0-9._-]+$/, 'ASCII, no spaces')
})

test('SHA256SUMS matches every file and does not list itself', () => {
  const lines = fs.readFileSync(path.join(out, 'SHA256SUMS'), 'utf8').trim().split('\n')
  assert.equal(lines.length, built.names.length - 1)
  for (const l of lines) {
    const [h, f] = l.split('  ')
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex'), h, f)
  }
})

test('skill zips are byte-identical to the website downloads', () => {
  const idx = lib.readJson('apps/web/public/downloads/index.json').data
  assert.equal(idx.aegisVersion, version)
  for (const s of idx.skills) {
    const a = fs.readFileSync(path.join(out, `aegis-skill-${s.name}-${version}.zip`))
    assert.ok(a.equals(fs.readFileSync(lib.abs(`apps/web/public/downloads/skills/${s.name}.zip`))), s.name)
    assert.equal(crypto.createHash('sha256').update(a).digest('hex'), s.zipSha256)
  }
  const prompts = zipAt(`aegis-prompts-${version}.zip`)
  assert.equal(prompts.length, idx.skills.length)
  for (const p of prompts) assert.ok(p.data.equals(fs.readFileSync(lib.abs(`apps/web/public/downloads/prompts/${p.name}`))))
})

test('every ZIP re-opens with valid CRCs, safe ASCII names, and has no secrets', () => {
  for (const n of built.names.filter(x => x.endsWith('.zip'))) {
    const entries = zipAt(n)
    assert.ok(entries.length > 0, n)
    assert.deepEqual(V.commonProblems(entries), [], n)
  }
})

test('Gemini archives: manifest at the root, version equals the package, self-contained', () => {
  const gem = lib.readJson('packages/aegis/gemini-extension.json').data
  for (const platform of ['darwin', 'linux', 'win32']) {
    const entries = zipAt(`${platform}.${gem.name}.zip`)
    assert.deepEqual(V.geminiProblems(entries, version, { name: gem.name }), [])
    const m = JSON.parse(entries.find(e => e.name === 'gemini-extension.json').data.toString('utf8'))
    assert.equal(m.version, version)
    assert.ok(entries.some(e => e.name === 'GEMINI.md'))
    assert.ok(entries.filter(e => /^skills\/[^/]+\/SKILL\.md$/.test(e.name)).length === 24)
    assert.ok(!entries.some(e => /^(cli|lib|mcp)\//.test(e.name)), 'no server code, the manifest runs the pinned npx package')
  }
})

test('ChatGPT bundle: skills-only Agent Plugins layout within the verified limits', () => {
  const entries = zipAt(`aegis-chatgpt-plugin-${version}.zip`)
  assert.deepEqual(V.chatgptProblems(entries, version), [])
  const names = entries.map(e => e.name)
  assert.ok(!names.includes('mcp.json') && !names.some(n => /hooks|\.app\.json/.test(n)))
  const plugin = JSON.parse(entries.find(e => e.name === 'plugin.json').data.toString('utf8'))
  assert.equal(plugin.version, version)
  const iface = plugin.extensions['com.openai'].interface
  assert.equal(iface.defaultPrompt.length, 3)
  const icon = entries.find(e => e.name === 'assets/logo.png')
  const info = V.imageInfo(icon.name, icon.data)
  assert.ok(info.width === info.height && info.width >= 48 && icon.data.length < 5 * 1024 * 1024)
  assert.equal(entries.filter(e => /^skills\/[^/]+\/SKILL\.md$/.test(e.name)).length, 24)
})

test('the packages other than aegis get the tarball only, and non-releasable packages are refused', () => {
  const o = path.join(tmp, 'core')
  const r = buildAssets({ pkg: lib.findPackage('themis-core'), out: o, npmTarball: fakeTgz })
  assert.deepEqual(r.names.sort(), [path.basename(fakeTgz), 'SHA256SUMS'].sort())
  assert.throws(() => buildAssets({ pkg: lib.findPackage('themis-plugin'), out: path.join(tmp, 'plugin') }), /not releasable/)
  assert.throws(() => buildAssets({ pkg: aegis, out }), /not empty/)
})

// ---- the validators themselves ----
const goodPlugin = () => JSON.parse(fs.readFileSync(lib.abs('listings/chatgpt/plugin.json'), 'utf8'))
const bundle = (plugin, extra = []) => [
  { name: 'plugin.json', data: JSON.stringify(plugin) }, { name: 'README.md', data: 'r' },
  { name: 'LICENSE', data: 'l' }, { name: 'LICENSE-APACHE', data: 'l' }, { name: 'LICENSE-MIT', data: 'l' },
  { name: 'assets/logo.png', data: fs.readFileSync(lib.abs('listings/chatgpt/assets/logo.png')) },
  { name: 'skills/demo/SKILL.md', data: '---\nname: demo\ndescription: d\n---\nbody\n' }, ...extra
].map(e => ({ name: e.name, data: Buffer.from(e.data) }))

test('validator accepts a minimal good bundle and rejects each broken rule', () => {
  assert.deepEqual(V.chatgptProblems(bundle(goodPlugin()), version), [])
  const bad = (mut, re, extra) => {
    const p = goodPlugin(); mut(p)
    assert.match(V.chatgptProblems(bundle(p, extra), version).join('\n'), re)
  }
  bad(p => { p.version = '0.0.1' }, /version/)
  bad(p => { p.extensions['com.openai'].interface.displayName = 'x'.repeat(31) }, /displayName is 31/)
  bad(p => { p.extensions['com.openai'].interface.shortDescription = 'x'.repeat(31) }, /shortDescription is 31/)
  bad(p => { p.extensions['com.openai'].interface.longDescription = 'x'.repeat(4001) }, /longDescription is 4001/)
  bad(p => { p.extensions['com.openai'].interface.defaultPrompt = ['a', 'b', 'c', 'd'] }, /1 to 3 prompts/)
  bad(p => { p.extensions['com.openai'].interface.logo = './assets/missing.png' }, /not in the archive/)
  bad(p => { p.hooks = {} }, /hooks/)
  bad(p => { p.$schema = 'https://example.invalid/x' }, /\$schema/)
  bad(() => {}, /mcp\.json must not be/, [{ name: 'mcp.json', data: '{}' }])
  bad(() => {}, /secret|private key/, [{ name: 'skills/demo/references/x.md', data: '-----BEGIN RSA PRIVATE KEY-----\nabc' }])
  bad(() => {}, /forbidden file/, [{ name: '.env', data: 'A=1' }])
  bad(() => {}, /ASCII/, [{ name: 'skills/demo/references/café.md', data: 'x' }])
})

test('validator rejects non-square and tiny icons', () => {
  const png = (w, h) => { const b = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b }
  const withIcon = (w, h) => bundle(goodPlugin()).map(e => (e.name === 'assets/logo.png' ? { name: e.name, data: png(w, h) } : e))
  assert.match(V.chatgptProblems(withIcon(512, 256), version).join('\n'), /square/)
  assert.match(V.chatgptProblems(withIcon(32, 32), version).join('\n'), /at least 48px/)
  assert.deepEqual(V.chatgptProblems(withIcon(48, 48), version), [])
})

test('zip reader detects corruption', () => {
  const z = createZip([{ name: 'a.txt', data: Buffer.from('hello hello hello hello') }])
  assert.equal(readZip(z)[0].data.toString(), 'hello hello hello hello')
  const broken = Buffer.from(z)
  broken[40] ^= 0xff
  assert.throws(() => readZip(broken), /CRC|size|inflate|invalid/i)
})
