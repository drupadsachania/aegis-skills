'use strict'

const React = require('react')
const Layout = require('../../components/Layout')
const InstallTabs = require('../../components/InstallTabs')
const CopyButton = require('../../components/CopyButton')

const h = React.createElement

const H2_STYLE = {
  fontFamily: 'var(--f-display)',
  fontWeight: 400,
  fontSize: '28px',
  letterSpacing: '-0.015em',
  color: 'var(--cream)',
  lineHeight: 1.1
}
const NOTE_STYLE = { fontSize: '14px', color: 'var(--muted)', marginBottom: '20px', maxWidth: '560px', lineHeight: 1.7 }

function SectionHead ({ num, title }) {
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '24px' } },
    h('span', { className: 'ds-num' }, num),
    h('h2', { style: H2_STYLE }, title)
  )
}

function SkillDetailPage ({ manifest, family, scopeHtml, flatPrompt, intelAsOf, download, packTabs }) {
  const tagList = [
    ...(manifest.tags || []).map(t => h('span', { key: `tag-${t}`, className: 'tag-pill' }, t)),
    ...(manifest.frameworks || []).map(f => h('span', { key: `fw-${f}`, className: 'tag-pill purple' }, f))
  ]
  const all = manifest.phases || []
  const authored = all.filter(p => !p.auto).length
  const live = all.length - authored

  return h(
    Layout,
    { title: manifest.name, description: (manifest.description || '').slice(0, 160) },
    h(
      'div',
      { className: 'container', style: { paddingTop: '80px', paddingBottom: '120px' } },

      // Meta bar
      h(
        'div',
        { className: 'hero-meta', style: { marginBottom: '32px' } },
        h('span', { className: 'dot' }),
        h('span', { className: 'sep' }),
        'SKILL',
        h('span', { className: 'sep' }),
        family.label,
        manifest.version
          ? h('span', { className: 'sep' })
          : null,
        manifest.version
          ? h('span', {
            style: {
              fontFamily: 'var(--f-mono)',
              fontSize: '10px',
              color: 'var(--bg)',
              background: 'var(--gold)',
              padding: '1px 8px',
              letterSpacing: '0.06em'
            }
          }, `v${manifest.version}`)
          : null
      ),

      h(
        'h1',
        {
          style: {
            fontFamily: 'var(--f-display)',
            fontWeight: 400,
            fontSize: 'clamp(40px, 6vw, 80px)',
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            color: 'var(--cream)',
            marginBottom: '16px',
            overflowWrap: 'anywhere'
          }
        },
        manifest.name
      ),
      h(
        'p',
        {
          style: {
            fontFamily: 'var(--f-sans)',
            fontSize: '17px',
            color: 'var(--cream-dim)',
            maxWidth: '660px',
            lineHeight: 1.65,
            fontWeight: 300,
            paddingBottom: '48px',
            borderBottom: '1px solid var(--border-dim)',
            marginBottom: '64px'
          }
        },
        manifest.description
      ),

      tagList.length > 0
        ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '64px', marginTop: '-40px' } }, ...tagList)
        : null,

      // 01 Use it now
      h(
        'div',
        { style: { marginBottom: '72px' } },
        h(SectionHead, { num: '01', title: 'Use it now' }),
        h(
          'div',
          { className: 'download-grid' },
          h(
            'div',
            { className: 'download-card' },
            h('h3', null, 'Single-file prompt'),
            h('p', { className: 'meta' }, `Every phase in one file · Intel as of ${intelAsOf || 'unknown'} · ${Math.ceil(download.promptBytes / 1024)} KB`),
            h('p', null, 'Paste it into any chat AI, or add the file to a Project, Gem or custom instructions.'),
            h(
              'div',
              { className: 'download-actions' },
              h(CopyButton, { text: flatPrompt, label: 'COPY PROMPT' }),
              h('a', { className: 'btn-ghost', href: download.prompt, download: '' }, 'Download .md')
            )
          ),
          h(
            'div',
            { className: 'download-card' },
            h('h3', null, 'Skill zip'),
            h('p', { className: 'meta' }, `SKILL.md, skill.json and references/ · ${Math.ceil(download.zipBytes / 1024)} KB`),
            h('p', null, 'Upload to Claude.ai (Settings → Capabilities → Skills) or unzip into any Agent Skills folder.'),
            h('a', { className: 'btn-primary', href: download.zip, download: '' }, 'Download .zip')
          )
        )
      ),

      // 02 Phases
      h(
        'div',
        { style: { marginBottom: '72px' } },
        h(SectionHead, { num: '02', title: 'Phases' }),
        h(
          'p',
          { style: NOTE_STYLE },
          `This skill has ${authored} authored phase${authored === 1 ? '' : 's'}${live > 0 ? ` plus ${live} live intel feed${live === 1 ? '' : 's'} updated monthly` : ''}. Each phase represents a distinct analysis step with its own context window.`
        ),
        h(
          'div',
          { className: 'lifecycle' },
          ...all.map((phase, i) =>
            h(
              'div',
              { key: phase.id, className: 'lifecycle-step' },
              h('span', { className: 'lifecycle-num' }, String(i + 1).padStart(2, '0')),
              h(
                'span',
                { className: 'lifecycle-name' },
                phase.id,
                // Auto-generated phases are a live feed, not authored tradecraft.
                phase.auto
                  ? h('span', {
                    style: {
                      marginLeft: '8px', padding: '1px 6px', borderRadius: '3px',
                      border: '1px solid var(--border)', color: 'var(--gold)',
                      fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.1em',
                      verticalAlign: 'middle'
                    }
                  }, 'LIVE')
                  : null
              ),
              h('span', { className: 'lifecycle-tokens' }, `${phase.tokens != null ? phase.tokens.toLocaleString() : '—'} tokens`)
            )
          )
        )
      ),

      // 03 Scope and authorization
      h(
        'div',
        { style: { marginBottom: '72px' } },
        h(SectionHead, { num: '03', title: 'Scope and authorization' }),
        scopeHtml
          ? h('div', { className: 'prose', dangerouslySetInnerHTML: { __html: scopeHtml } })
          : h('p', null, 'This skill has no scope section.')
      ),

      // 04 Install the whole pack
      h(
        'div',
        null,
        h(SectionHead, { num: '04', title: 'Install the whole pack' }),
        h('p', { style: NOTE_STYLE }, 'Installs every Aegis skill, including this one, into your coding assistant.'),
        h(InstallTabs, { tabs: packTabs }),
        h(
          'p',
          { style: { ...NOTE_STYLE, marginTop: '20px' } },
          'Prefer MCP? Connect the ',
          h('a', { href: '/mcp' }, 'hosted Aegis MCP'),
          ` and ask for get_skill with name "${manifest.name}".`
        )
      )
    )
  )
}

async function getStaticPaths () {
  const { listSkills } = require('../../lib/aegis')
  return { paths: (await listSkills()).map(s => ({ params: { name: s.name } })), fallback: false }
}

async function getStaticProps ({ params }) {
  const fs = require('fs')
  const path = require('path')
  const { getSkillManifest, familyOf, labelOf } = require('../../lib/aegis')
  const { SKILLS_DIR, DOWNLOADS_DIR } = require('../../lib/site-paths')
  const { stripFrontmatter, extractSection } = require('../../lib/skill-page')
  const { renderMarkdown } = require('../../lib/markdown')
  const { PATHS } = require('../../lib/install-commands')

  const manifest = await getSkillManifest(params.name)
  if (!manifest) return { notFound: true }

  const indexPath = path.join(DOWNLOADS_DIR, 'index.json')
  if (!fs.existsSync(indexPath)) throw new Error('public/downloads is missing: run `npm run prebuild -w @aegis-skills/web`')
  const entry = JSON.parse(fs.readFileSync(indexPath, 'utf8')).skills.find(s => s.name === params.name)
  if (!entry) throw new Error(`no download entry for ${params.name}`)

  const flatPrompt = fs.readFileSync(path.join(DOWNLOADS_DIR, 'prompts', `${params.name}.md`), 'utf8')
  const body = stripFrontmatter(fs.readFileSync(path.join(SKILLS_DIR, params.name, 'SKILL.md'), 'utf8'))
  const scope = extractSection(body, 'Scope and authorization')
  const key = familyOf(params.name)

  return {
    props: {
      manifest: {
        name: manifest.name,
        version: manifest.version ?? entry.version ?? null,
        description: manifest.description || '',
        tags: manifest.tags || [],
        frameworks: manifest.frameworks || [],
        phases: (manifest.phases || []).map(p => ({ id: p.id, tokens: p.tokens ?? null, auto: !!p.auto }))
      },
      family: { key, label: labelOf(key) },
      scopeHtml: scope ? renderMarkdown(scope) : null,
      flatPrompt,
      intelAsOf: entry.intelAsOf,
      download: { prompt: entry.prompt, zip: entry.zip, promptBytes: entry.promptBytes, zipBytes: entry.zipBytes },
      packTabs: PATHS.find(p => p.id === 'skill-pack').platforms
    }
  }
}

module.exports = { default: SkillDetailPage, getStaticPaths, getStaticProps }
module.exports.default = SkillDetailPage
