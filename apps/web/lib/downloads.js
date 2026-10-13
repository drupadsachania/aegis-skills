'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createZip } = require('./zip')

const SAFE_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function readIntelAsOf (skillDir) {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(skillDir, 'intel-state.json'), 'utf8'))
    const d = state && state['last-intel-sync']
    return typeof d === 'string' && ISO_DATE.test(d) ? d : null
  } catch {
    return null
  }
}

function stampIntel (text, intelAsOf) {
  if (/intel as of/i.test(text)) return text
  return `> Intel as of ${intelAsOf || 'unknown'}\n\n${text}`
}

// Contracts §7: a distributed skill is SKILL.md + skill.json + references/ only.
function collectSkillEntries (skillDir, name) {
  const entries = []
  for (const f of ['SKILL.md', 'skill.json']) {
    const p = path.join(skillDir, f)
    if (!fs.existsSync(p)) throw new Error(`${name}: missing ${f}`)
    entries.push({ name: `${name}/${f}`, data: fs.readFileSync(p) })
  }
  const refDir = path.join(skillDir, 'references')
  if (fs.existsSync(refDir)) {
    for (const f of fs.readdirSync(refDir).sort()) {
      const p = path.join(refDir, f)
      if (f.endsWith('.md') && fs.statSync(p).isFile()) {
        entries.push({ name: `${name}/references/${f}`, data: fs.readFileSync(p) })
      }
    }
  }
  return entries
}

function readVersion (skillDir) {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(skillDir, 'skill.json'), 'utf8')).version
    return typeof v === 'string' ? v : null
  } catch {
    return null
  }
}

/**
 * @param {{ skillsDir: string, outDir: string, aegisVersion: string,
 *           flatten: (skillDir: string) => string|Promise<string> }} opts
 */
async function buildDownloads ({ skillsDir, outDir, flatten, aegisVersion }) {
  const promptsDir = path.join(outDir, 'prompts')
  const zipsDir = path.join(outDir, 'skills')
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(promptsDir, { recursive: true })
  fs.mkdirSync(zipsDir, { recursive: true })

  const names = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && SAFE_NAME.test(d.name))
    .map(d => d.name)
    .filter(n => fs.existsSync(path.join(skillsDir, n, 'SKILL.md')))
    .sort()

  const skills = []
  for (const name of names) {
    const dir = path.join(skillsDir, name)
    const intelAsOf = readIntelAsOf(dir)
    const prompt = stampIntel(String(await flatten(dir)), intelAsOf)
    const zip = createZip(collectSkillEntries(dir, name))
    fs.writeFileSync(path.join(promptsDir, `${name}.md`), prompt, 'utf8')
    fs.writeFileSync(path.join(zipsDir, `${name}.zip`), zip)
    skills.push({
      name,
      version: readVersion(dir),
      intelAsOf,
      prompt: `/downloads/prompts/${name}.md`,
      zip: `/downloads/skills/${name}.zip`,
      promptBytes: Buffer.byteLength(prompt, 'utf8'),
      zipBytes: zip.length,
      zipSha256: crypto.createHash('sha256').update(zip).digest('hex')
    })
  }

  const index = { aegisVersion, skills }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8')
  return index
}

module.exports = { buildDownloads, collectSkillEntries, readIntelAsOf, stampIntel }
