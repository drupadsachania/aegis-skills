'use strict'

/**
 * Helpers for the Aegis skill format, osk 1.1.
 *
 * SKILL.md carries Agent Skills frontmatter only (name, description, license,
 * metadata). skill.json is the machine-readable sidecar: phases (id, file,
 * tokens, auto), frameworks, tags, research, self-learning and context.
 * Readers must ignore unknown skill.json fields.
 */

const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const OSK = '1.1'
const LICENSE = 'Apache-2.0 OR MIT'
const PHASE_FILE = /^references\/[a-z0-9][a-z0-9._-]*\.md$/

// Lock gray-matter to js-yaml; the eval-based javascript engine stays disabled.
const ENGINES = { javascript: () => { throw new Error('javascript front-matter engine is disabled') } }

// Line endings must not change the count: a Windows (CRLF) checkout and a Linux (LF) checkout of the same skill
// have to agree, or lint fails on one of them. Count as if every line ended with a single LF.
function estimateTokens (text) {
  return Math.ceil(String(text).replace(/\r\n/g, '\n').length / 4)
}

function parseSkillMd (raw) {
  const m = matter(raw, { engines: ENGINES })
  return { data: m.data || {}, body: m.content }
}

function normalizeDescription (s) {
  return String(s || '').replace(/\s+/g, ' ').trim()
}

function readSkillJson (skillDir) {
  return JSON.parse(fs.readFileSync(path.join(skillDir, 'skill.json'), 'utf8'))
}

function writeSkillJson (skillDir, obj) {
  fs.writeFileSync(path.join(skillDir, 'skill.json'), JSON.stringify(obj, null, 2) + '\n', 'utf8')
}

function phaseFileTokens (skillDir, phase) {
  if (!PHASE_FILE.test(String(phase.file))) throw new Error(`bad phase file: ${phase.file}`)
  return estimateTokens(fs.readFileSync(path.join(skillDir, phase.file), 'utf8'))
}

// Recompute every phase's token count from its file. Returns true when skill.json changed.
function syncTokens (skillDir) {
  const sj = readSkillJson(skillDir)
  let changed = false
  for (const p of sj.phases || []) {
    const t = phaseFileTokens(skillDir, p)
    if (p.tokens !== t) { p.tokens = t; changed = true }
  }
  if (changed) writeSkillJson(skillDir, sj)
  return changed
}

function phaseTitle (id) {
  const s = String(id).replace(/-/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Progressive disclosure: every phase file is linked from the SKILL.md body.
// Adds links for phases the body does not link yet, under one "## Phases" section
// that always sits at the end of the body.
function appendPhaseLinks (body, phases) {
  const missing = phases.filter(p => !body.includes(`](${p.file})`))
  if (missing.length === 0) return body
  const lines = missing.map(p => `- [${phaseTitle(p.id)}](${p.file})${p.auto ? ' — auto-updated weekly' : ''}`)
  if (/^## Phases\s*$/m.test(body)) return body.trimEnd() + '\n' + lines.join('\n') + '\n'
  return body.trimEnd() + '\n\n## Phases\n\nLoad each phase only when the workflow reaches it:\n\n' + lines.join('\n') + '\n'
}

module.exports = {
  OSK,
  LICENSE,
  PHASE_FILE,
  estimateTokens,
  parseSkillMd,
  normalizeDescription,
  readSkillJson,
  writeSkillJson,
  phaseFileTokens,
  syncTokens,
  phaseTitle,
  appendPhaseLinks
}
