'use strict'

const React = require('react')
const Layout = require('../../components/Layout')
const InstallTabs = require('../../components/InstallTabs')
const CopyButton = require('../../components/CopyButton')
const { BrandIcon } = require('../../components/Brand')

const h = React.createElement

function SectionHead ({ num, title }) {
  return h('div', { className: 'sec-h' },
    h('span', { className: 'ds-num' }, num),
    h('h2', null, title))
}

function SkillDetailPage ({ manifest, family, scopeHtml, flatPrompt, intelAsOf, download, packTabs }) {
  const tagList = [
    ...(manifest.tags || []).map(t => h('span', { key: `tag-${t}`, className: 'tag-pill' }, t)),
    ...(manifest.frameworks || []).map(f => h('span', { key: `fw-${f}`, className: 'tag-pill themis' }, f))
  ]
  const all = manifest.phases || []
  const authored = all.filter(p => !p.auto).length
  const intelRefs = all.length - authored

  return h(
    Layout,
    { title: manifest.name, description: (manifest.description || '').slice(0, 160) },
    h(
      'div',
      { className: 'container', style: { paddingBottom: '120px' } },

      h(
        'div',
        { className: 'page-head skill-hero' },
        h('nav', { className: 'breadcrumb', 'aria-label': 'Breadcrumb' },
          h(BrandIcon, { brand: 'aegis', size: 20, className: 'crumb-icon' }),
          h('a', { href: '/skills' }, 'Skills'),
          h('span', { className: 'sep', 'aria-hidden': 'true' }, '/'),
          h('span', null, family.label),
          manifest.version ? h('span', { className: 'version-pill' }, `v${manifest.version}`) : null),
        h('h1', null, manifest.name),
        h('p', { className: 'skill-desc' }, manifest.description),
        tagList.length > 0 ? h('div', { className: 'tag-row' }, ...tagList) : null
      ),

      // 01 Use it now
      h(
        'div',
        { className: 'skill-block' },
        h(SectionHead, { num: '01', title: 'Use it now' }),
        h(
          'div',
          { className: 'download-grid' },
          h(
            'div',
            { className: 'download-card', 'data-reveal': '' },
            h('h3', null, 'Single-file prompt'),
            h('p', { className: 'meta' }, `Every phase in one file · Intel as of ${intelAsOf || 'unknown'} · ${Math.ceil(download.promptBytes / 1024)} KB`),
            h('p', null, 'Paste it into any chat AI, or add the file to a Project, Gem or custom instructions.'),
            h(
              'div',
              { className: 'download-actions' },
              h(CopyButton, { text: flatPrompt, label: 'COPY PROMPT' }),
              h('a', { className: 'btn-ghost', href: download.prompt, download: true }, 'Download .md')
            )
          ),
          h(
            'div',
            { className: 'download-card', 'data-reveal': '' },
            h('h3', null, 'Skill zip'),
            h('p', { className: 'meta' }, `SKILL.md, skill.json and references/ · ${Math.ceil(download.zipBytes / 1024)} KB`),
            h('p', null, 'Upload to Claude.ai (Settings → Capabilities → Skills) or unzip into any Agent Skills folder.'),
            h('a', { className: 'btn-primary', href: download.zip, download: true }, 'Download .zip')
          )
        )
      ),

      // 02 Phases
      h(
        'div',
        { className: 'skill-block' },
        h(SectionHead, { num: '02', title: 'Phases' }),
        h(
          'p',
          { className: 'note' },
          `This skill has ${authored} authored phase${authored === 1 ? '' : 's'}${intelRefs > 0 ? ` plus ${intelRefs} intel reference${intelRefs === 1 ? '' : 's'} updated monthly` : ''}. Each phase represents a distinct analysis step with its own context window.`
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
                phase.id
              ),
              h('span', { className: 'lifecycle-tokens' }, `${phase.tokens != null ? phase.tokens.toLocaleString() : '—'} tokens`)
            )
          )
        )
      ),

      // 03 Scope and authorization
      h(
        'div',
        { className: 'skill-block' },
        h(SectionHead, { num: '03', title: 'Scope and authorization' }),
        scopeHtml
          ? h('div', { className: 'prose', dangerouslySetInnerHTML: { __html: scopeHtml } })
          : h('p', null, 'This skill has no scope section.')
      ),

      // 04 Install the whole pack
      h(
        'div',
        { className: 'skill-block' },
        h(SectionHead, { num: '04', title: 'Install the whole pack' }),
        h('p', { className: 'note' }, 'Installs every Aegis skill, including this one, into your coding assistant.'),
        h(InstallTabs, { tabs: packTabs }),
        h(
          'p',
          { className: 'note', style: { marginTop: '20px' } },
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
