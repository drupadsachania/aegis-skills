'use strict'

const path = require('path')
const { buildDownloads } = require('../../lib/downloads')
const { loadFlattener } = require('../../lib/flat-prompt')
const { SKILLS_DIR, DOWNLOADS_DIR, aegisVersion } = require('../../lib/site-paths')
const page = require('../../pages/skills/[name]')

jest.setTimeout(60000)

beforeAll(async () => {
  // Same output the prebuild script produces (gitignored).
  await buildDownloads({ skillsDir: SKILLS_DIR, outDir: DOWNLOADS_DIR, flatten: loadFlattener(), aegisVersion: aegisVersion() })
})

test('getStaticPaths lists every skill', async () => {
  const { paths, fallback } = await page.getStaticPaths()
  expect(fallback).toBe(false)
  expect(paths).toHaveLength(24)
})

test('every skill has a stamped prompt, a zip and a Scope and authorization section', async () => {
  const { paths } = await page.getStaticPaths()
  for (const { params } of paths) {
    const { props } = await page.getStaticProps({ params })
    expect(props.flatPrompt).toMatch(/intel as of/i)
    expect(props.download.zip).toBe(`/downloads/skills/${params.name}.zip`)
    expect(props.download.prompt).toBe(`/downloads/prompts/${params.name}.md`)
    expect(props.scopeHtml).toMatch(/authori[sz]ed/i)
    expect(props.manifest.phases.length).toBeGreaterThan(0)
    expect(JSON.parse(JSON.stringify(props))).toEqual(props) // serialisable, no undefined
  }
})

test('unknown skill is a 404', async () => {
  expect(await page.getStaticProps({ params: { name: 'does-not-exist' } })).toEqual({ notFound: true })
})

test('page module does not pull server-only modules at top level', () => {
  const src = require('fs').readFileSync(path.join(__dirname, '..', '..', 'pages', 'skills', '[name].js'), 'utf8')
  const topLevel = src.split(/async function getStatic/)[0]
  expect(topLevel).not.toMatch(/require\(['"](fs|path|marked|\.\.\/\.\.\/lib\/(aegis|markdown|downloads|site-paths|flat-prompt))['"]\)/)
})
