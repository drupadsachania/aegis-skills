#!/usr/bin/env node
'use strict'

/**
 * Aegis intel-sync — weekly threat-intel learning loop.
 *
 * Reads the operator's local threat-intel corpus (daily article feeds, knowledge
 * graph, long-form attack breakdowns), extracts patterns, routes them to the
 * skills whose attack surface they land on, and writes an auto-managed block into
 * each skill's references/live-threat-intel.md plus self-learning.coverage-gaps.
 *
 * SAFETY: machine-generated content lives strictly between markers in its own
 * file. Human-authored references are never read, modified, or overwritten.
 *
 * Usage:
 *   node scripts/intel-sync.js [--days 7] [--dry-run] [--news DIR] [--breakdowns DIR]
 */

const fs = require('fs').promises
const path = require('path')
const { routeItem } = require('./intel-routing')

const REPO_ROOT = path.join(__dirname, '..')
const SKILLS_DIR = path.join(REPO_ROOT, 'skills')
const STATE_FILE = path.join(REPO_ROOT, '.intel-sync-state.json')

const BEGIN = '<!-- BEGIN AEGIS-INTEL-SYNC — auto-generated, do not edit by hand -->'
const END = '<!-- END AEGIS-INTEL-SYNC -->'

const DEFAULT_NEWS = 'C:/Users/Drupad/Cybersec-News'
const DEFAULT_BREAKDOWNS = 'C:/Users/Drupad/God mode'

const TECH_RE = /\b(?:T\d{4}(?:\.\d{3})?|AML\.T\d{4})\b/g

function parseArgs(argv) {
  const a = { days: 7, dryRun: false, news: DEFAULT_NEWS, breakdowns: DEFAULT_BREAKDOWNS }
  for (let i = 2; i < argv.length; i++) {
    const v = argv[i]
    if (v === '--dry-run') a.dryRun = true
    else if (v === '--days') a.days = parseInt(argv[++i], 10) || 7
    else if (v === '--news') a.news = argv[++i]
    else if (v === '--breakdowns') a.breakdowns = argv[++i]
  }
  return a
}

const dayMs = 24 * 60 * 60 * 1000
function daysAgo(dateStr) {
  const t = Date.parse(dateStr)
  if (Number.isNaN(t)) return Infinity
  return Math.floor((Date.now() - t) / dayMs)
}

async function exists(p) {
  try { await fs.access(p); return true } catch { return false }
}

/* ---------------------------------------------------------------- ingestion */

// Daily feeds: YYYY-MM-DD_articles*.json (handles _v2/_batch2/_merged/_final variants).
async function loadArticles(newsDir, days) {
  if (!await exists(newsDir)) return { items: [], files: 0, missing: true }
  const files = (await fs.readdir(newsDir)).filter(f => /^\d{4}-\d{2}-\d{2}_articles.*\.json$/.test(f))
  const seen = new Set()
  const items = []
  let used = 0

  for (const f of files.sort()) {
    const date = f.slice(0, 10)
    if (daysAgo(date) > days) continue
    let parsed
    try { parsed = JSON.parse(await fs.readFile(path.join(newsDir, f), 'utf8')) }
    catch { continue }
    used++
    const arts = Array.isArray(parsed) ? parsed : (parsed.articles || [])
    for (const a of arts) {
      // Dedupe across same-day variant files and across sources.
      const cveKey = (a.cves || []).slice().sort().join(',')
      const key = cveKey || (a.link || a.title || '').toLowerCase().slice(0, 120)
      if (!key || seen.has(key)) continue
      seen.add(key)
      items.push({ ...a, date: a.published || parsed.date || date })
    }
  }
  return { items, files: used, missing: false }
}

// Knowledge graph: typed nodes + weighted links with first_seen/last_seen/count.
async function loadGraph(newsDir, days) {
  const p = path.join(newsDir, 'knowledge_graph.json')
  if (!await exists(p)) return null
  try {
    const g = JSON.parse(await fs.readFile(p, 'utf8'))
    const nodes = g.nodes || []
    const active = nodes.filter(n => daysAgo(n.last_seen) <= days * 4)
    const byType = {}
    for (const n of active) (byType[n.type] = byType[n.type] || []).push(n)
    for (const k of Object.keys(byType)) byType[k].sort((a, b) => (b.count || 0) - (a.count || 0))
    const links = (g.links || [])
      .filter(l => daysAgo(l.last_seen) <= days * 4)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    return { built: g.built, span: g.span, byType, links, total: nodes.length }
  } catch { return null }
}

// Long-form teardowns: attack-breakdown-YYYY-MM-DD-slug.md
async function loadBreakdowns(dir, days) {
  if (!await exists(dir)) return []
  const files = (await fs.readdir(dir)).filter(f => /^attack-breakdown-\d{4}-\d{2}-\d{2}-.*\.md$/.test(f))
  const out = []
  for (const f of files.sort()) {
    const date = f.slice(17, 27)
    if (daysAgo(date) > days) continue
    let text
    try { text = await fs.readFile(path.join(dir, f), 'utf8') } catch { continue }
    const first = text.split('\n').find(l => l.startsWith('# ')) || f
    const techniques = [...new Set(String(text).match(TECH_RE) || [])]
    out.push({
      file: f,
      date,
      title: first.replace(/^#\s*/, '').trim(),
      techniques,
      // Route breakdowns using their title + a content sample (they are long).
      summary: text.slice(0, 4000),
      tags: [],
      source: 'attack-breakdown',
      tier: 'A'
    })
  }
  return out
}

/* ------------------------------------------------------------- aggregation */

function techniquesFrom(items) {
  const counts = new Map()
  for (const it of items) {
    const found = new Set(String(`${it.title} ${it.summary}`).match(TECH_RE) || [])
    for (const t of found) counts.set(t, (counts.get(t) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function tally(items, field) {
  const c = new Map()
  for (const it of items) for (const v of (it[field] || [])) c.set(v, (c.get(v) || 0) + 1)
  return [...c.entries()].sort((a, b) => b[1] - a[1])
}

// Reporting agencies, regulators and media outlets appear in `orgs` because they
// are named in the article — they are not victims or vendors under attack.
// Counting them as "under repeated pressure" produces actively misleading intel.
const NON_VICTIM_ORGS = new Set([
  'fbi', 'cisa', 'nsa', 'epa', 'ncsc', 'enisa', 'europol', 'interpol', 'doj', 'dhs',
  'sec', 'ftc', 'gchq', 'mi5', 'nist', 'mitre', 'us-cert', 'ic3', 'cert',
  'the hacker news', 'bleepingcomputer', 'securityweek', 'the record', 'sc media',
  'cybernews', 'krebsonsecurity', 'dark reading', 'infosecurity magazine', 'wired',
  'reuters', 'bloomberg', 'ransomware.live', 'google', 'microsoft'
])

function victimOrgs(items) {
  return tally(items, 'orgs').filter(([o]) => !NON_VICTIM_ORGS.has(String(o).toLowerCase()))
}

// Coverage gaps are derived, not invented: a gap is a technique/CVE cluster that
// showed up repeatedly for a skill's surface in this period.
function deriveGaps(items, breakdowns) {
  const gaps = []

  // Recurring CVEs are the strongest signal — the same flaw reported repeatedly.
  const cves = tally(items, 'cves')
  const recurring = cves.filter(([, n]) => n >= 2)
  if (recurring.length) {
    gaps.push(`Recurring CVE exposure: ${recurring.slice(0, 5).map(([c, n]) => `${c} (x${n})`).join(', ')} — confirm patch status and detection coverage`)
  } else if (cves.length) {
    gaps.push(`CVEs referenced this period: ${cves.slice(0, 6).map(([c]) => c).join(', ')} — verify whether this estate is exposed`)
  }

  // Explicit ATT&CK IDs (mostly from Tier-A teardowns; news rarely carries them).
  const techs = techniquesFrom([...items, ...breakdowns])
  if (techs.length) {
    gaps.push(`Techniques observed: ${techs.slice(0, 6).map(([t, n]) => `${t} (x${n})`).join(', ')} — verify a validated detection exists for each`)
  }

  // Recurring themes: the dominant tags carry the pattern signal when no ATT&CK
  // IDs are present, which is the common case for news-tier reporting.
  const themes = tally(items, 'tags').filter(([, n]) => n >= 3)
  if (themes.length) {
    gaps.push(`Dominant themes: ${themes.slice(0, 6).map(([t, n]) => `${t} (x${n})`).join(', ')} — confirm controls address the recurring mechanism, not just individual incidents`)
  }

  // Repeat-targeted vendors/products indicate sustained pressure worth reviewing.
  // Reporting agencies and media are excluded — they are narrators, not victims.
  const orgs = victimOrgs(items).filter(([, n]) => n >= 2)
  if (orgs.length) {
    gaps.push(`Vendors/products named repeatedly: ${orgs.slice(0, 6).map(([o, n]) => `${o} (x${n})`).join(', ')} — review exposure to these in the estate`)
  }

  for (const b of breakdowns) {
    if (b.techniques.length) {
      gaps.push(`Teardown "${b.title.slice(0, 90)}" (${b.date}) — techniques ${b.techniques.slice(0, 5).join(', ')}; check telemetry availability before assuming coverage`)
    }
  }
  return gaps.slice(0, 8)
}

/* -------------------------------------------------------------- rendering */

function esc(s) {
  return String(s || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
}

function renderBlock(skill, bundle, meta) {
  const { items, breakdowns, gaps, graph } = bundle
  const L = []
  L.push(BEGIN)
  L.push('')
  L.push(`_Auto-generated by \`scripts/intel-sync.js\` on ${meta.runDate} from the operator's threat-intel corpus (window: last ${meta.days} days). Regenerable — do not hand-edit inside these markers. Human-authored tradecraft lives in the other reference files and is never modified by this process._`)
  L.push('')

  if (!items.length && !breakdowns.length) {
    L.push('No intel routed to this skill in the current window.')
    L.push('')
    L.push(END)
    return L.join('\n')
  }

  L.push(`## Current Observations (${meta.runDate})`)
  L.push('')
  L.push(`**Routed to this skill:** ${items.length} feed item(s), ${breakdowns.length} teardown(s).`)
  L.push('')

  if (items.length) {
    L.push('| Date | Observation | CVEs | Actors | Source |')
    L.push('|------|-------------|------|--------|--------|')
    for (const it of items.slice(0, 12)) {
      L.push(`| ${esc(it.date)} | ${esc(it.title).slice(0, 130)} | ${esc((it.cves || []).join(', ')) || '—'} | ${esc((it.actors || []).join(', ')) || '—'} | ${esc(it.source)} |`)
    }
    L.push('')
  }

  if (breakdowns.length) {
    L.push('### In-depth teardowns (Tier A)')
    L.push('')
    for (const b of breakdowns) {
      L.push(`- **${esc(b.title).slice(0, 150)}** (${b.date}) — ATT&CK: ${b.techniques.slice(0, 8).join(', ') || 'n/a'}`)
    }
    L.push('')
  }

  const techs = techniquesFrom([...items, ...breakdowns])
  if (techs.length) {
    L.push('### Techniques observed in this window')
    L.push('')
    L.push(techs.slice(0, 20).map(([t, n]) => `\`${t}\`×${n}`).join(' · '))
    L.push('')
  }

  const cves = tally(items, 'cves')
  if (cves.length) {
    L.push('### CVEs referenced')
    L.push('')
    L.push(cves.slice(0, 20).map(([c, n]) => (n > 1 ? `${c} (x${n})` : c)).join(', '))
    L.push('')
  }

  const actors = tally(items, 'actors')
  if (actors.length) {
    L.push('### Actors named')
    L.push('')
    L.push(`${actors.slice(0, 15).map(([a, n]) => (n > 1 ? `${a} (x${n})` : a)).join(', ')}`)
    L.push('')
    L.push('_Attribution is context, not conclusion — treat named actors as reported by the source, with the source\'s confidence, and prefer TTP-driven action over actor-driven action._')
    L.push('')
  }

  // Knowledge-graph trends, filtered to nodes this skill's own intel actually
  // mentions. Global top-N would show AI concepts inside the OT skill — trending
  // data that is real but irrelevant here reads as noise and erodes trust.
  if (graph && graph.byType) {
    const localHay = [...items, ...breakdowns]
      .map(i => `${i.title} ${i.summary}`.toLowerCase()).join(' ')
    const candidates = (graph.byType.concept || [])
      .concat(graph.byType.actor || [], graph.byType.org || [], graph.byType.tool || [])
    const trending = candidates
      .filter(n => n.label && localHay.includes(String(n.label).toLowerCase()))
      .slice(0, 8)
    if (trending.length) {
      L.push('### Trending in the knowledge graph (relevant to this surface)')
      L.push('')
      L.push(trending.map(n => `${n.label} (seen ${n.count}x, last ${n.last_seen})`).join(' · '))
      L.push('')
    }
  }

  if (gaps.length) {
    L.push('### Coverage questions raised by this period')
    L.push('')
    for (const g of gaps) L.push(`- ${g}`)
    L.push('')
    L.push('_These are prompts for verification, not confirmed gaps. Confirm against actual controls before treating any as covered or open — an unvalidated detection is partial coverage, not coverage._')
    L.push('')
  }

  L.push(END)
  return L.join('\n')
}

/* ------------------------------------------------------------------ writing */

// Write the block into references/live-threat-intel.md, preserving anything a
// human placed outside the markers.
async function writeIntelFile(skillDir, block) {
  const refDir = path.join(skillDir, 'references')
  await fs.mkdir(refDir, { recursive: true })
  const target = path.join(refDir, 'live-threat-intel.md')

  let existing = ''
  try { existing = await fs.readFile(target, 'utf8') } catch { /* new file */ }

  let next
  if (existing.includes(BEGIN) && existing.includes(END)) {
    const pre = existing.slice(0, existing.indexOf(BEGIN))
    const post = existing.slice(existing.indexOf(END) + END.length)
    next = pre + block + post
  } else if (existing.trim()) {
    next = `${existing.trimEnd()}\n\n${block}\n`
  } else {
    next = `# Live Threat Intel — ${path.basename(skillDir)}\n\n${block}\n`
  }

  if (next === existing) return false
  await fs.writeFile(target, next, 'utf8')
  return true
}

// Register the auto phase in SKILL.md if absent. Marked `auto: true` so health
// scoring excludes it from authored phase-coverage.
async function ensurePhase(skillDir) {
  const p = path.join(skillDir, 'SKILL.md')
  let text
  try { text = await fs.readFile(p, 'utf8') } catch { return false }
  if (text.includes('id: live-threat-intel')) return false

  const lines = text.split('\n')
  // Find the phases block and the line where it ends (next top-level key).
  const start = lines.findIndex(l => /^phases:\s*$/.test(l))
  if (start === -1) return false
  let end = start + 1
  while (end < lines.length && /^\s+/.test(lines[end]) && lines[end].trim() !== '') end++

  const entry = [
    '  - id: live-threat-intel',
    '    ref: references/live-threat-intel.md',
    '    lazy: true',
    '    auto: true'
  ]
  lines.splice(end, 0, ...entry)
  await fs.writeFile(p, lines.join('\n'), 'utf8')
  return true
}

// Write machine intel to intel-state.json — NOT skill.json. skill.json is a build
// artifact regenerated from SKILL.md on every compile, so writing there would be
// silently wiped by the next `aegis compile`. The compiler merges this file into
// self-learning at build time.
async function updateIntelState(skillDir, gaps, runDate, stats) {
  const p = path.join(skillDir, 'intel-state.json')
  const state = {
    'coverage-gaps': gaps,
    'last-intel-sync': runDate,
    'intel-window-days': stats.days,
    'items-routed': stats.items,
    'teardowns-routed': stats.teardowns
  }
  await fs.writeFile(p, JSON.stringify(state, null, 2) + '\n', 'utf8')
  return true
}

/* --------------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv)
  const runDate = new Date().toISOString().slice(0, 10)
  console.log(`Aegis intel-sync — window ${args.days}d${args.dryRun ? ' (DRY RUN)' : ''}`)

  const { items, files, missing } = await loadArticles(args.news, args.days)
  if (missing) console.warn(`  ! news dir not found: ${args.news}`)
  const graph = await loadGraph(args.news, args.days)
  const breakdowns = await loadBreakdowns(args.breakdowns, args.days)

  console.log(`  corpus: ${items.length} article(s) from ${files} file(s); ${breakdowns.length} teardown(s); graph ${graph ? graph.total + ' nodes' : 'unavailable'}`)

  if (!items.length && !breakdowns.length) {
    console.log('  nothing in window — no skills updated.')
    return
  }

  // Route everything.
  const perSkill = new Map()
  const add = (slug, key, val) => {
    if (!perSkill.has(slug)) perSkill.set(slug, { items: [], breakdowns: [] })
    perSkill.get(slug)[key].push(val)
  }
  for (const it of items) for (const h of routeItem(it)) add(h.skill, 'items', it)
  for (const b of breakdowns) {
    const hits = routeItem(b)
    // Tier-A teardowns always inform the synthesis skill even if routing is thin.
    if (!hits.some(h => h.skill === 'threat-intel-synthesis')) hits.push({ skill: 'threat-intel-synthesis', score: 1 })
    for (const h of hits) add(h.skill, 'breakdowns', b)
  }

  const available = new Set((await fs.readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter(e => e.isDirectory()).map(e => e.name))

  let updated = 0
  const summary = []
  for (const [slug, bundle] of [...perSkill.entries()].sort()) {
    if (!available.has(slug)) { console.warn(`  ! unknown skill in routing table: ${slug}`); continue }
    const skillDir = path.join(SKILLS_DIR, slug)
    const gaps = deriveGaps(bundle.items, bundle.breakdowns)
    const block = renderBlock(slug, { ...bundle, gaps, graph }, { runDate, days: args.days })

    if (args.dryRun) {
      summary.push(`  ${slug}: ${bundle.items.length} item(s), ${bundle.breakdowns.length} teardown(s), ${gaps.length} gap prompt(s)`)
      continue
    }

    await ensurePhase(skillDir)
    const wrote = await writeIntelFile(skillDir, block)
    await updateIntelState(skillDir, gaps, runDate, {
      days: args.days, items: bundle.items.length, teardowns: bundle.breakdowns.length
    })
    if (wrote) updated++
    summary.push(`  ${slug}: ${bundle.items.length} item(s), ${bundle.breakdowns.length} teardown(s), ${gaps.length} gap prompt(s)${wrote ? '' : ' (unchanged)'}`)
  }

  console.log(`\nRouted to ${perSkill.size} skill(s):`)
  summary.forEach(s => console.log(s))

  if (!args.dryRun) {
    await fs.writeFile(STATE_FILE, JSON.stringify({
      'last-run': new Date().toISOString(),
      'window-days': args.days,
      'articles-ingested': items.length,
      'teardowns-ingested': breakdowns.length,
      'skills-routed': perSkill.size,
      'skills-written': updated
    }, null, 2), 'utf8')
    console.log(`\n✓ ${updated} skill intel block(s) written. Run \`node bin/aegis.js compile\` to rebuild artifacts.`)
  } else {
    console.log('\n(dry run — nothing written)')
  }
}

main().catch(err => {
  console.error('intel-sync error:', err.message)
  process.exit(1)
})
