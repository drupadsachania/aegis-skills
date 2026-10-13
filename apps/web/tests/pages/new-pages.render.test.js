'use strict'

// Renders the pages added or changed for the design review (home, quick start, trust, Themis) with
// their REAL static props, then crawls every internal link and anchor they emit.
const fs = require('fs')
const path = require('path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { listDocs } = require('../../lib/docs')
const { DOCS_DIR, SKILLS_DIR, WEB_ROOT } = require('../../lib/site-paths')

const PAGES = {
  '/': '../../pages/index',
  '/quickstart': '../../pages/quickstart',
  '/trust': '../../pages/trust',
  '/themis': '../../pages/themis',
  '/security': '../../pages/security',
  '/docs': '../../pages/docs/index'
}
const STATIC_ROUTES = ['/', '/skills', '/paths', '/themis', '/mcp', '/docs', '/security', '/license', '/trust', '/quickstart', '/terms']

const html = {}
beforeAll(async () => {
  for (const [route, mod] of Object.entries(PAGES)) {
    const page = require(mod)
    const props = (await page.getStaticProps()).props
    html[route] = renderToStaticMarkup(React.createElement(page.default, props))
  }
})

const text = h => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ')

describe('home', () => {
  test('primary CTA is the quick start, secondary browses all skills, "choose your path" stays as a section', () => {
    const h = html['/']
    expect(h).toMatch(/<a class="btn-primary" href="\/quickstart">Try it in 2 minutes<\/a>/)
    expect(h).toMatch(/<a class="btn-ghost" href="\/skills">Browse all 24 skills<\/a>/)
    expect(h).toContain('id="paths"')
    expect(text(h)).toContain('Choose your path')
  })

  test('the worked example uses real skill names and the five-step flow', () => {
    const t = text(html['/'])
    expect(t).toContain('Aegis provides the specialist skill. Themis governs how an agent invokes it and what it can do with the result.')
    for (const skill of ['exposure-validation', 'threat-modeling']) {
      expect(t).toContain(skill)
      expect(fs.existsSync(path.join(SKILLS_DIR, skill, 'SKILL.md'))).toBe(true)
    }
    expect((html['/'].match(/class="flow-step /g) || []).length).toBe(5)
    expect(html['/']).toMatch(/<ol class="flow-steps">/)
    expect(t).toContain('Illustrative task, real skill names')
  })

  test('each pack card states the relationship in one sentence', () => {
    const t = text(html['/'])
    expect(t).toContain('Aegis provides the specialist skill; Themis decides how an agent invokes it.')
    expect(t).toContain('Themis governs how an agent invokes an Aegis skill and what it can do with the result.')
  })

  test('provenance section shows a real stamp and links the trust page', () => {
    const { sampleStamp, stampLine } = require('../../lib/version-stamp-sample')
    const s = sampleStamp()
    expect(s.themis).not.toBe('unknown')
    expect(s.aegis).not.toBe('unknown')
    expect(s.osk).not.toBe('unknown')
    const t = text(html['/'])
    expect(t).toContain('Provenance and approval')
    expect(html['/']).toContain('id="provenance"')
    expect(t).toContain(stampLine(s))
    expect(html['/']).toContain('href="/trust"')
  })
})

describe('quick start', () => {
  test('shows real captured MCP output and labels the illustrative part', () => {
    const t = text(html['/quickstart'])
    expect(t).toContain('Try it in 2 minutes')
    expect(t).toContain('"name": "exposure-validation"')
    expect(t).toContain('"count": 2')
    expect(t).toContain('Real output.')
    expect(t).toContain('Illustrative, not captured output')
    expect(t).toContain('https://aegis-skills.vercel.app/api/mcp')
    expect(t).not.toMatch(/\bweekly\b|\bhealth(?!care)/i)
  })

  test('offers the npx skill-pack install with a guide, using commands the installer accepts', () => {
    const h = html['/quickstart']
    const t = text(h)
    expect(h).toContain('id="npx"')
    expect(t).toContain('Install the skill pack with npx')
    expect(t).toContain('npx aegis-skills install --platform claude')
    expect(t).toContain('npx aegis-skills list')
    expect(h).toContain('href="/docs/aegis/getting-started"')
    expect(t).toMatch(/24 skills in ~\/my-project\/\.claude\/skills/)
    expect(t).not.toMatch(/after the first release/i)
  })

  test('the scope lines shown come from the skill file itself', () => {
    const skill = fs.readFileSync(path.join(SKILLS_DIR, 'exposure-validation', 'SKILL.md'), 'utf8')
    const t = text(html['/quickstart'])
    const m = /Purpose: ([^\n]+)/.exec(skill)
    expect(m).not.toBeNull()
    expect(t).toContain(m[1].trim().slice(0, 60))
  })
})

describe('trust page', () => {
  test('renders heading, diagram with a text alternative, and the sections', () => {
    const h = html['/trust']
    const t = text(h)
    expect(t).toContain('Trust and data flow')
    expect((h.match(/<svg class="fd-svg/g) || []).length).toBe(2) // wide + stacked
    expect(h).toMatch(/role="img" aria-labelledby="fd-t-wide fd-d-wide"/)
    expect(h).toMatch(/role="img" aria-labelledby="fd-t-narrow fd-d-narrow"/)
    expect((h.match(/<li value="\d"/g) || []).length).toBe(8)
    for (const s of ['At a glance', 'No hosted inference', 'Telemetry', 'Credentials', 'What is stored locally', 'How to verify this yourself', 'Sources in the repo']) {
      expect(t).toContain(s)
    }
  })

  test('the font fact is stated once, generically, and the page never claims "no third party"', () => {
    const md = fs.readFileSync(path.join(DOCS_DIR, 'trust', 'data-flow.md'), 'utf8')
    const sentence = 'loads web fonts from Adobe Fonts (use.typekit.net and p.typekit.net)'
    expect(md.split(sentence).length - 1).toBe(1)
    expect(text(html['/trust'])).toContain(sentence)
    expect(html['/trust']).not.toMatch(/no third part|contacts no third|never contacts/i)
  })

  test('the stored sources exist in the repository', () => {
    const md = fs.readFileSync(path.join(DOCS_DIR, 'trust', 'data-flow.md'), 'utf8')
    const rels = [...md.matchAll(/\]\((\.\.[^)#\s]+)\)/g)].map(m => m[1])
    expect(rels.length).toBeGreaterThan(25)
    for (const r of rels) {
      const target = path.resolve(DOCS_DIR, 'trust', r)
      expect(`${r}: ${fs.existsSync(target)}`).toBe(`${r}: true`)
    }
  })

  test('forbidden words stay out (same rules as the docs content test)', () => {
    const md = fs.readFileSync(path.join(DOCS_DIR, 'trust', 'data-flow.md'), 'utf8')
    for (const bad of ['ChatGPT Action', 'openai-action', '@aegis-skills/core', 'aegis compile', 'better-sqlite3', 'Supabase', '/api/themis', '/api/audit', '/api/exposure', '/invoke']) {
      expect(`${bad}: ${md.includes(bad)}`).toBe(`${bad}: false`)
    }
    expect(/\bhealth(?!care)/i.test(md)).toBe(false)
    expect(/\bweekly\b/i.test(md)).toBe(false)
  })
})

describe('themis page', () => {
  test('has a provenance section with the stamp and a trust link', () => {
    const t = text(html['/themis'])
    expect(html['/themis']).toContain('id="provenance"')
    expect(t).toContain('Provenance and approval')
    expect(t).toContain('Themis ' + require('../../lib/version-stamp-sample').sampleStamp().themis)
  })
})

describe('footer, security and docs hub link to the trust page', () => {
  test.each(['/', '/quickstart', '/trust', '/themis', '/security', '/docs'])('%s has a /trust link and the footer Trust column', route => {
    expect(html[route]).toContain('href="/trust"')
  })
  test('security and the docs hub name it', () => {
    expect(text(html['/security'])).toContain('Trust and data flow')
    expect(text(html['/docs'])).toContain('Trust and data flow')
  })
})

describe('internal link crawl', () => {
  const skillNames = fs.readdirSync(SKILLS_DIR).filter(n => fs.existsSync(path.join(SKILLS_DIR, n, 'SKILL.md')))
  const docHrefs = listDocs(DOCS_DIR).flatMap(s => s.pages.map(p => p.href))
  const known = new Set([...STATIC_ROUTES, ...skillNames.map(n => `/skills/${n}`), ...docHrefs, '/docs/aegis', '/docs/themis'])

  test('every internal href on the changed pages resolves, and every anchor exists', () => {
    const problems = []
    for (const [route, h] of Object.entries(html)) {
      for (const m of h.matchAll(/<a [^>]*?href="([^"]+)"/g)) {
        const href = m[1].replace(/&amp;/g, '&')
        if (/^(https?:|mailto:)/.test(href)) continue
        const [p, hash] = href.split('#')
        const target = p === '' ? route : p
        if (target.startsWith('/downloads/')) { if (!fs.existsSync(path.join(WEB_ROOT, 'public', target))) problems.push(`${route} -> ${href}`); continue }
        if (!known.has(target)) { problems.push(`${route} -> ${href}`); continue }
        if (hash && html[target] && !new RegExp(`id="${hash}"`).test(html[target])) problems.push(`${route} -> ${href} (no anchor)`)
      }
    }
    expect(problems).toEqual([])
  })
})
