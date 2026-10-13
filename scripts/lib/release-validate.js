'use strict'
// Validators for release ZIPs, run on the entries re-read from the finished archive (scripts/lib/zip-read.js), so they
// check what a consumer would unpack, not what the builder intended. Each returns an array of problem strings.
// Limits come from docs/listings/chatgpt-app.md (OpenAI submission page, checked 2026-10-12); the maximum ZIP size,
// the allowed `category`/`capabilities` values and the full manifest schema are NOT verified and are not enforced.

const SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
const LIMITS = { displayName: 30, shortDescription: 30, longDescription: 4000, prompts: 3, promptLength: 128, iconBytes: 5 * 1024 * 1024, iconMinPx: 48, iconMaxPx: 4096 }

// Names that must never be inside a release archive.
const FORBIDDEN_NAME = [
  /(^|\/)\.env(\.|$)/, /(^|\/)\.git(\/|$)/, /(^|\/)\.npmrc$/, /(^|\/)node_modules\//, /\.(pem|key|p12|pfx|tgz)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/, /(^|\/)\.DS_Store$/, /\.tsbuildinfo$/, /(^|\/)(intel-state|health|\.intel-sync-state)\.json$/
]
// Content patterns for credentials. AWS documentation placeholders (...EXAMPLE) are ignored.
const SECRET_CONTENT = [
  ['private key block', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['AWS access key id', /\bAKIA(?![0-9A-Z]*EXAMPLE)[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['API key (sk-...)', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/]
]

function parseJson (entries, name, problems) {
  const e = entries.find(x => x.name === name)
  if (!e) { problems.push(`${name} is missing from the archive root`); return null }
  try { return JSON.parse(e.data.toString('utf8')) } catch (err) { problems.push(`${name} is not valid JSON: ${err.message}`); return null }
}

function commonProblems (entries, { maxEntryBytes = 8 * 1024 * 1024 } = {}) {
  const p = []
  if (!entries.length) p.push('archive is empty')
  for (const e of entries) {
    if (!/^[\x21-\x7e]+$/.test(e.name)) p.push(`entry name is not printable ASCII without spaces: ${JSON.stringify(e.name)}`)
    if (FORBIDDEN_NAME.some(r => r.test(e.name))) p.push(`forbidden file in archive: ${e.name}`)
    if (e.data.length > maxEntryBytes) p.push(`${e.name} is ${e.data.length} bytes (limit ${maxEntryBytes})`)
    if (/\.(md|json|txt|js|toml|ya?ml|svg)$/i.test(e.name)) {
      const text = e.data.toString('utf8')
      for (const [what, re] of SECRET_CONTENT) if (re.test(text)) p.push(`${e.name} looks like it contains a ${what}`)
    }
  }
  return p
}

// {width, height, type} for PNG, WebP and SVG (viewBox/width/height), or null.
function imageInfo (name, data) {
  if (data.length > 24 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: 'png', width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
  }
  if (data.length > 30 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    const t = data.toString('ascii', 12, 16)
    if (t === 'VP8X') return { type: 'webp', width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3) }
    if (t === 'VP8 ') return { type: 'webp', width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff }
    if (t === 'VP8L') { const v = data.readUInt32LE(21); return { type: 'webp', width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 } }
  }
  if (/\.svg$/i.test(name)) {
    const text = data.toString('utf8')
    const vb = /viewBox\s*=\s*"\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(text)
    if (vb) return { type: 'svg', width: Number(vb[1]), height: Number(vb[2]) }
  }
  return null
}

function chatgptProblems (entries, version) {
  const p = commonProblems(entries)
  const names = new Set(entries.map(e => e.name))
  for (const bad of ['mcp.json', '.mcp.json', '.app.json', 'hooks', 'hooks.json']) {
    if (entries.some(e => e.name === bad || e.name.startsWith(`${bad}/`))) p.push(`${bad} must not be in a skills-only plugin ZIP`)
  }
  if (entries.some(e => /(^|\/)hooks\//.test(e.name))) p.push('lifecycle hooks are rejected for submission')
  const plugin = parseJson(entries, 'plugin.json', p)
  if (plugin) {
    if (plugin.$schema !== SCHEMA) p.push(`plugin.json "$schema" must be ${SCHEMA}`)
    if (typeof plugin.name !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(plugin.name) || plugin.name.length > 64) p.push('plugin.json "name": lowercase letters, digits and single hyphens, at most 64 characters')
    if (plugin.version !== version) p.push(`plugin.json "version" is ${plugin.version}, expected ${version}`)
    for (const k of ['hooks', 'apps', 'mcpServers']) if (k in plugin) p.push(`plugin.json must not declare "${k}"`)
    const iface = plugin.extensions && plugin.extensions['com.openai'] && plugin.extensions['com.openai'].interface
    const ox = plugin.extensions && plugin.extensions['com.openai']
    if (ox) for (const k of ['hooks', 'apps']) if (k in ox) p.push(`extensions.com.openai must not declare "${k}"`)
    if (!iface) p.push('plugin.json has no extensions.com.openai.interface')
    else {
      const len = (k, max) => { if (typeof iface[k] !== 'string' || !iface[k]) p.push(`interface.${k} is missing`); else if (iface[k].length > max) p.push(`interface.${k} is ${iface[k].length} characters (limit ${max})`) }
      len('displayName', LIMITS.displayName); len('shortDescription', LIMITS.shortDescription); len('longDescription', LIMITS.longDescription)
      const prompts = iface.defaultPrompt
      if (!Array.isArray(prompts) || prompts.length < 1 || prompts.length > LIMITS.prompts) p.push(`interface.defaultPrompt must hold 1 to ${LIMITS.prompts} prompts`)
      else prompts.forEach((x, i) => { if (typeof x !== 'string' || !x || x.length > LIMITS.promptLength) p.push(`interface.defaultPrompt[${i}] must be 1-${LIMITS.promptLength} characters`) })
      for (const k of ['composerIcon', 'logo']) {
        const ref = iface[k]
        if (typeof ref !== 'string' || !ref.startsWith('./') || ref.includes('..')) { p.push(`interface.${k} must be a ./relative path inside the plugin`); continue }
        const e = entries.find(x => x.name === ref.slice(2))
        if (!e) { p.push(`interface.${k} points at ${ref}, which is not in the archive`); continue }
        if (e.data.length > LIMITS.iconBytes) p.push(`${ref} is larger than 5 MiB`)
        const info = imageInfo(e.name, e.data)
        if (!info) p.push(`${ref} is not a readable PNG, WebP or SVG`)
        else {
          if (info.width !== info.height) p.push(`${ref} is ${info.width}x${info.height}; icons must be square`)
          if (info.width < LIMITS.iconMinPx) p.push(`${ref} is ${info.width}px; at least ${LIMITS.iconMinPx}px is required`)
          if (info.type !== 'svg' && info.width > LIMITS.iconMaxPx) p.push(`${ref} is larger than ${LIMITS.iconMaxPx}px`)
        }
      }
    }
  }
  const skills = new Set()
  for (const n of names) {
    if (/^(plugin\.json|README\.md|LICENSE(-APACHE|-MIT)?)$/.test(n) || /^assets\/[\w.-]+$/.test(n)) continue
    const m = /^skills\/([a-z0-9-]+)\/(SKILL\.md|references\/[A-Za-z0-9._-]+\.md)$/.exec(n)
    if (!m) { p.push(`unexpected file in plugin ZIP: ${n}`); continue }
    skills.add(m[1])
  }
  if (!skills.size) p.push('no skills in the plugin ZIP')
  for (const s of skills) {
    const e = entries.find(x => x.name === `skills/${s}/SKILL.md`)
    if (!e) { p.push(`skills/${s} has no SKILL.md`); continue }
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(e.data.toString('utf8'))
    if (!fm) { p.push(`skills/${s}/SKILL.md has no front matter`); continue }
    const nm = /^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(fm[1])
    if (!nm || nm[1] !== s) p.push(`skills/${s}/SKILL.md front matter name is "${nm ? nm[1] : ''}", expected "${s}"`)
    if (!/^description:/m.test(fm[1])) p.push(`skills/${s}/SKILL.md front matter has no description`)
  }
  for (const f of ['README.md', 'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT']) if (!names.has(f)) p.push(`${f} is missing`)
  return p
}

function geminiProblems (entries, version, { name } = {}) {
  const p = commonProblems(entries)
  const names = new Set(entries.map(e => e.name))
  const m = parseJson(entries, 'gemini-extension.json', p)
  if (m) {
    if (m.version !== version) p.push(`gemini-extension.json version is ${m.version}, expected ${version}`)
    if (!/^[a-z0-9-]+$/.test(m.name || '')) p.push('gemini-extension.json "name" must use lowercase letters, digits and dashes')
    if (name && m.name !== name) p.push(`gemini-extension.json name is ${m.name}, the asset name says ${name}`)
    if (m.contextFileName && !names.has(m.contextFileName)) p.push(`contextFileName ${m.contextFileName} is not in the archive`)
    for (const [id, s] of Object.entries(m.mcpServers || {})) {
      if (s.command !== 'npx') p.push(`mcpServers.${id}.command must be "npx": the archive ships no node_modules`)
      if (!(s.args || []).some(a => a === `aegis-skills@${version}`)) p.push(`mcpServers.${id}.args must pin aegis-skills@${version}`)
    }
  }
  for (const f of ['GEMINI.md', 'README.md', 'LICENSE', 'LICENSE-APACHE', 'LICENSE-MIT']) if (!names.has(f)) p.push(`${f} is missing`)
  const skills = new Set()
  for (const n of names) {
    if (/^(gemini-extension\.json|GEMINI\.md|README\.md|LICENSE(-APACHE|-MIT)?)$/.test(n)) continue
    const s = /^skills\/([a-z0-9-]+)\/(SKILL\.md|references\/[A-Za-z0-9._-]+\.md)$/.exec(n)
    if (!s) { p.push(`unexpected file in Gemini archive: ${n}`); continue }
    skills.add(s[1])
  }
  if (!skills.size) p.push('no skills/ in the Gemini archive')
  for (const s of skills) if (!names.has(`skills/${s}/SKILL.md`)) p.push(`skills/${s} has no SKILL.md`)
  return p
}

module.exports = { SCHEMA, LIMITS, commonProblems, chatgptProblems, geminiProblems, imageInfo, SECRET_CONTENT }
