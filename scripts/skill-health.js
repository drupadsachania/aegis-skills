#!/usr/bin/env node
'use strict'

const fs = require('fs').promises
const path = require('path')
const https = require('https')
const { execFile } = require('child_process')

const SKILLS_DIR = path.join(process.cwd(), 'skills')
const HEALTH_FILE = path.join(process.cwd(), 'health.json')

const ATTACK_STIX_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json'
// CISA Known Exploited Vulnerabilities — a curated, slow-moving catalogue.
// Using this as the CVE corpus (instead of the rolling 30-day NVD window) makes
// cve-freshness stable week-to-week: a score change now reflects a real content
// or catalogue change, not the feed's publish-date window rotating under us.
const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
const NVD_RECENT_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=STARTDATE&pubEndDate=ENDDATE&resultsPerPage=100'

// A skill must score below threshold for this many consecutive runs before it is
// flagged / a PR is opened. Removes spurious flags from single-run scoring noise.
const HEALTH_THRESHOLD = 0.80
const HYSTERESIS_RUNS = 2

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

function extractKevKeywords(kevResponse) {
  // Build a stable keyword set from CISA KEV vendor names. Vendors (cisco, fortinet,
  // vmware, apache, citrix, ivanti, …) are meaningful currency signals and far fewer
  // than product strings, so the set discriminates without saturating. Generic product
  // words are excluded so "manager"/"gateway"/"server" don't count as a match.
  const keywords = new Set()
  const STOP = new Set([
    'the', 'and', 'for', 'inc', 'llc', 'ltd', 'corp', 'server', 'software', 'systems',
    'technologies', 'technology', 'network', 'networks', 'security', 'group', 'solutions',
    'products', 'product', 'communications', 'international', 'enterprise', 'labs', 'team'
  ])
  for (const v of (kevResponse.vulnerabilities || [])) {
    keywords.add((v.cveID || '').toLowerCase())
    for (const word of String(v.vendorProject || '').toLowerCase().split(/[^a-z0-9]+/)) {
      if (word.length > 3 && !STOP.has(word)) keywords.add(word)
    }
  }
  return keywords
}

// Recency: reward skills whose content was updated recently, decaying to a floor
// as they age past the stale threshold. Rewards maintenance over keyword stuffing.
function recencyScore(ageDays, staleThresholdDays) {
  const threshold = staleThresholdDays || 90
  if (ageDays <= threshold) return 1.0
  if (ageDays >= threshold * 2) return 0.7
  // Linear decay 1.0 → 0.7 between threshold and 2× threshold
  return 1.0 - 0.3 * ((ageDays - threshold) / threshold)
}

function scoreSkill(skill, phaseContents, attackTechniques, cveKeywords, contentAgeDays) {
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
  // Ramp on the STABLE KEV corpus: 0.7 base, +0.05 per KEV vendor/product/CVE hit up to 1.0.
  const cveScore = Math.min(1.0, 0.7 + Math.min(0.3, cveMentioned.length * 0.05))
  const phaseScore = Math.min(1.0, (skill.phases || []).length / 5)

  const staleThreshold = (skill['self-learning'] && skill['self-learning']['stale-threshold-days']) || 90
  const recency = recencyScore(contentAgeDays, staleThreshold)

  // Weights sum to 1.0. Recency rewards active maintenance so the score reflects
  // upkeep, not just one-time keyword overlap with threat feeds.
  const healthScore = Math.round(
    (attackCoverage * 0.45 + cveScore * 0.25 + phaseScore * 0.15 + recency * 0.15) * 100
  ) / 100

  return {
    'health-score': healthScore,
    'attack-coverage': Math.round(attackCoverage * 100) / 100,
    'cve-freshness': Math.round(cveScore * 100) / 100,
    'phase-coverage': Math.round(phaseScore * 100) / 100,
    'recency': Math.round(recency * 100) / 100,
    'content-age-days': contentAgeDays,
    'relevant-techniques-count': relevantTechniques.length
  }
}

async function newestContentAgeDays(skillDir) {
  // Age (in days) since the skill's content was last changed. Prefer the git
  // commit time of the skill directory — it is meaningful and survives a CI
  // checkout (which resets file mtimes). Fall back to filesystem mtime when git
  // is unavailable (e.g. running outside a repo).
  const gitAge = await gitLastCommitAgeDays(skillDir)
  if (gitAge !== null) return gitAge

  const candidates = [
    path.join(skillDir, 'SKILL.md'),
    path.join(skillDir, 'artifacts', 'system-prompt.txt')
  ]
  try {
    const refs = await fs.readdir(path.join(skillDir, 'references'))
    for (const r of refs) candidates.push(path.join(skillDir, 'references', r))
  } catch { /* no references dir */ }

  let newest = 0
  for (const f of candidates) {
    try {
      const st = await fs.stat(f)
      if (st.mtimeMs > newest) newest = st.mtimeMs
    } catch { /* missing file — skip */ }
  }
  if (newest === 0) return 9999 // no readable content — treat as very stale
  return Math.max(0, Math.round((Date.now() - newest) / (24 * 60 * 60 * 1000)))
}

function gitLastCommitAgeDays(skillDir) {
  // Returns whole days since the last commit that touched skillDir, or null on failure.
  return new Promise((resolve) => {
    execFile('git', ['log', '-1', '--format=%ct', '--', skillDir], { cwd: process.cwd() }, (err, stdout) => {
      if (err) return resolve(null)
      const epochSec = parseInt(String(stdout).trim(), 10)
      if (!epochSec) return resolve(null)
      const ageMs = Date.now() - epochSec * 1000
      resolve(Math.max(0, Math.round(ageMs / (24 * 60 * 60 * 1000))))
    })
  })
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
      const contentAgeDays = await newestContentAgeDays(path.join(SKILLS_DIR, dir))
      skills.push({ manifest, content, dir, contentAgeDays })
    } catch {
      console.warn(`Skipping ${dir} — no skill.json`)
    }
  }

  console.log(`Loaded ${skills.length} skills`)

  // Load previous run for hysteresis (consecutive sub-threshold streak per skill).
  let prevSkills = {}
  try {
    const prev = JSON.parse(await fs.readFile(HEALTH_FILE, 'utf8'))
    prevSkills = prev.skills || {}
  } catch { /* first run — no prior state */ }

  let attackTechniques = []
  try {
    console.log('Fetching MITRE ATT&CK STIX...')
    const stix = await fetchJson(ATTACK_STIX_URL)
    attackTechniques = extractAttackTechniques(stix)
    console.log(`ATT&CK: ${attackTechniques.length} techniques loaded`)
  } catch (err) {
    console.warn(`ATT&CK fetch failed (${err.message}) — using empty technique list`)
  }

  // CVE corpus: prefer the stable CISA KEV catalogue; fall back to the 30-day NVD
  // window only if KEV is unreachable so scoring degrades gracefully.
  let cveKeywords = new Set()
  let cveSource = 'none'
  try {
    console.log('Fetching CISA KEV catalogue...')
    const kev = await fetchJson(KEV_URL)
    cveKeywords = extractKevKeywords(kev)
    cveSource = 'kev'
    console.log(`KEV: ${cveKeywords.size} stable keywords loaded`)
  } catch (err) {
    console.warn(`KEV fetch failed (${err.message}) — falling back to NVD 30-day window`)
    try {
      const endDate = new Date().toISOString().slice(0, 19) + '.000'
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19) + '.000'
      const nvdUrl = NVD_RECENT_URL
        .replace('STARTDATE', encodeURIComponent(startDate))
        .replace('ENDDATE', encodeURIComponent(endDate))
      const nvd = await fetchJson(nvdUrl)
      cveKeywords = extractCveKeywords(nvd)
      cveSource = 'nvd'
      console.log(`NVD: ${cveKeywords.size} CVE keywords loaded`)
    } catch (err2) {
      console.warn(`NVD fetch also failed (${err2.message}) — using empty CVE list`)
    }
  }

  const results = {}
  const timestamp = new Date().toISOString()

  for (const { manifest, content, contentAgeDays } of skills) {
    const scores = scoreSkill(manifest, [content], attackTechniques, cveKeywords, contentAgeDays)
    // Hysteresis: increment the sub-threshold streak, or reset it to 0.
    const prevStreak = (prevSkills[manifest.name] && prevSkills[manifest.name]['below-streak']) || 0
    const belowStreak = scores['health-score'] < HEALTH_THRESHOLD ? prevStreak + 1 : 0
    results[manifest.name] = {
      ...scores,
      'below-streak': belowStreak,
      'last-updated': timestamp,
      version: manifest.version
    }
    const badge = scores['health-score'] >= 0.90 ? '🟢' : scores['health-score'] >= 0.75 ? '🟡' : '🔴'
    console.log(`${badge} ${manifest.name}: ${scores['health-score']}${belowStreak > 0 ? ` (below-streak ${belowStreak})` : ''}`)
  }

  const healthJson = {
    generated: timestamp,
    'cve-source': cveSource,
    'health-threshold': HEALTH_THRESHOLD,
    'hysteresis-runs': HYSTERESIS_RUNS,
    skills: results
  }
  await fs.writeFile(HEALTH_FILE, JSON.stringify(healthJson, null, 2), 'utf8')
  console.log(`\nWrote health.json with ${Object.keys(results).length} skills`)

  // A skill is only "failing" once it has been below threshold for HYSTERESIS_RUNS
  // consecutive runs — a single noisy dip does not trip the flag.
  const dipping = Object.entries(results).filter(([, v]) => v['health-score'] < HEALTH_THRESHOLD)
  const failing = dipping.filter(([, v]) => v['below-streak'] >= HYSTERESIS_RUNS)

  if (dipping.length > 0) {
    console.log(`\n${dipping.length} skill(s) below ${HEALTH_THRESHOLD} this run:`)
    dipping.forEach(([name, v]) => {
      const persistent = v['below-streak'] >= HYSTERESIS_RUNS
      console.log(`  - ${name}: ${v['health-score']} (streak ${v['below-streak']}/${HYSTERESIS_RUNS})${persistent ? ' ← PERSISTENT' : ' — transient, not flagged yet'}`)
    })
  }

  if (failing.length > 0) {
    console.log(`\n⚠ ${failing.length} skill(s) persistently below threshold (≥${HYSTERESIS_RUNS} runs):`)
    failing.forEach(([name, v]) => console.log(`  - ${name}: ${v['health-score']}`))
    process.exit(2)
  }

  console.log(`\n✓ No skills persistently below ${HEALTH_THRESHOLD} threshold`)
  process.exit(0)
}

main().catch(err => {
  console.error('skill-health fatal error:', err.message)
  process.exit(1)
})
