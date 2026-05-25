#!/usr/bin/env node
'use strict'

const fs = require('fs').promises
const path = require('path')
const https = require('https')

const SKILLS_DIR = path.join(process.cwd(), 'skills')
const HEALTH_FILE = path.join(process.cwd(), 'health.json')

const ATTACK_STIX_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json'
const NVD_RECENT_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=STARTDATE&pubEndDate=ENDDATE&resultsPerPage=100'

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'aegis-skill-health/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
        catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timed out')) })
  })
}

function extractAttackTechniques(stixBundle) {
  const techniques = []
  for (const obj of (stixBundle.objects || [])) {
    if (obj.type !== 'attack-pattern') continue
    const extRef = (obj.external_references || []).find(r => r.source_name === 'mitre-attack')
    if (!extRef) continue
    techniques.push({
      id: extRef.external_id,
      name: obj.name,
      description: (obj.description || '').slice(0, 500)
    })
  }
  return techniques
}

function extractCveKeywords(nvdResponse) {
  const keywords = new Set()
  for (const item of (nvdResponse.vulnerabilities || [])) {
    const cve = item.cve
    if (!cve) continue
    keywords.add(cve.id)
    for (const config of (cve.configurations || [])) {
      for (const node of (config.nodes || [])) {
        for (const match of (node.cpeMatch || [])) {
          const parts = (match.criteria || '').split(':')
          if (parts.length > 4) {
            keywords.add(parts[3])
            keywords.add(parts[4])
          }
        }
      }
    }
  }
  return keywords
}

function scoreSkill(skill, phaseContents, attackTechniques, cveKeywords) {
  const allContent = phaseContents.join('\n').toLowerCase()

  const relevantTechniques = attackTechniques.filter(t => {
    const frameworks = skill.frameworks || []
    if (frameworks.includes('mitre-attack') || frameworks.includes('mitre-engage')) return true
    const tags = (skill.tags || []).join(' ').toLowerCase()
    return t.name.toLowerCase().split(' ').some(word => tags.includes(word))
  })

  let attackCoverage = 1.0
  if (relevantTechniques.length > 0) {
    const covered = relevantTechniques.filter(t => {
      const tid = t.id.toLowerCase()
      const tname = t.name.toLowerCase().replace(/[^a-z0-9\s]/g, '')
      return allContent.includes(tid) || tname.split(' ').some(w => w.length > 4 && allContent.includes(w))
    })
    const ratio = covered.length / relevantTechniques.length
    attackCoverage = Math.min(1.0, ratio + 0.3)
  }

  const cveMentioned = [...cveKeywords].filter(kw =>
    kw.length > 3 && allContent.includes(kw.toLowerCase())
  )
  // Score on a ramp: 0.7 base, +0.1 per CVE/product hit up to 1.0
  const cveScore = Math.min(1.0, 0.7 + Math.min(0.3, cveMentioned.length * 0.05))
  const phaseScore = Math.min(1.0, (skill.phases || []).length / 5)

  const healthScore = Math.round(
    (attackCoverage * 0.5 + cveScore * 0.3 + phaseScore * 0.2) * 100
  ) / 100

  return {
    'health-score': healthScore,
    'attack-coverage': Math.round(attackCoverage * 100) / 100,
    'cve-freshness': Math.round(cveScore * 100) / 100,
    'phase-coverage': Math.round(phaseScore * 100) / 100,
    'relevant-techniques-count': relevantTechniques.length
  }
}

async function main() {
  console.log('Aegis skill-health pipeline starting...')

  let skillDirs
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true })
    skillDirs = entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch {
    console.error('No skills directory found')
    process.exit(1)
  }

  const skills = []
  for (const dir of skillDirs) {
    try {
      const manifestPath = path.join(SKILLS_DIR, dir, 'skill.json')
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
      const systemPromptPath = path.join(SKILLS_DIR, dir, 'artifacts', 'system-prompt.txt')
      let content = ''
      try { content = await fs.readFile(systemPromptPath, 'utf8') } catch { /* no artifacts yet */ }
      skills.push({ manifest, content, dir })
    } catch {
      console.warn(`Skipping ${dir} — no skill.json`)
    }
  }

  console.log(`Loaded ${skills.length} skills`)

  let attackTechniques = []
  try {
    console.log('Fetching MITRE ATT&CK STIX...')
    const stix = await fetchJson(ATTACK_STIX_URL)
    attackTechniques = extractAttackTechniques(stix)
    console.log(`ATT&CK: ${attackTechniques.length} techniques loaded`)
  } catch (err) {
    console.warn(`ATT&CK fetch failed (${err.message}) — using empty technique list`)
  }

  let cveKeywords = new Set()
  try {
    console.log('Fetching NVD CVE recent feed...')
    const endDate = new Date().toISOString().slice(0, 19) + '.000'
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19) + '.000'
    const nvdUrl = NVD_RECENT_URL
      .replace('STARTDATE', encodeURIComponent(startDate))
      .replace('ENDDATE', encodeURIComponent(endDate))
    const nvd = await fetchJson(nvdUrl)
    cveKeywords = extractCveKeywords(nvd)
    console.log(`NVD: ${cveKeywords.size} CVE keywords loaded`)
  } catch (err) {
    console.warn(`NVD fetch failed (${err.message}) — using empty CVE list`)
  }

  const results = {}
  const timestamp = new Date().toISOString()

  for (const { manifest, content } of skills) {
    const scores = scoreSkill(manifest, [content], attackTechniques, cveKeywords)
    results[manifest.name] = {
      ...scores,
      'last-updated': timestamp,
      version: manifest.version
    }
    const badge = scores['health-score'] >= 0.90 ? '🟢' : scores['health-score'] >= 0.75 ? '🟡' : '🔴'
    console.log(`${badge} ${manifest.name}: ${scores['health-score']}`)
  }

  const healthJson = {
    generated: timestamp,
    skills: results
  }
  await fs.writeFile(HEALTH_FILE, JSON.stringify(healthJson, null, 2), 'utf8')
  console.log(`\nWrote health.json with ${Object.keys(results).length} skills`)

  const failing = Object.entries(results).filter(([, v]) => v['health-score'] < 0.80)
  if (failing.length > 0) {
    console.log(`\n⚠ ${failing.length} skill(s) below 0.80 threshold:`)
    failing.forEach(([name, v]) => console.log(`  - ${name}: ${v['health-score']}`))
    process.exit(2)
  }

  console.log('\n✓ All skills above 0.80 threshold')
  process.exit(0)
}

main().catch(err => {
  console.error('skill-health fatal error:', err.message)
  process.exit(1)
})
