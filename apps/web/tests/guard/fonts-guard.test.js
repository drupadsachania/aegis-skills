'use strict'

// Adobe Fonts licence guard: the kit fonts (teimer-web, legitima, ...) are served by Adobe to allow-listed
// domains and must never be copied into the repo or a package. Only the open Red Hat Mono files may be
// committed. See docs/design/FONTS.md.
const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '..', '..', '..', '..')
const FONT_EXT = /\.(woff2?|otf|ttf|eot)$/i
const ALLOWED = /^red-hat-mono-[a-z0-9-]+\.woff2$/

function fontFiles (dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'node_modules') out.push(...fontFiles(abs)) } else if (FONT_EXT.test(e.name)) out.push(abs)
  }
  return out
}

const roots = [path.join(REPO, 'apps', 'web', 'public')]
const pkgs = path.join(REPO, 'packages')
if (fs.existsSync(pkgs)) {
  for (const p of fs.readdirSync(pkgs)) roots.push(path.join(pkgs, p, 'dist', 'ui'))
}

describe('font files', () => {
  test('only Red Hat Mono font files exist under apps/web/public and packages/*/dist/ui', () => {
    const bad = roots.flatMap(fontFiles).filter(f => !ALLOWED.test(path.basename(f)))
    expect(bad.map(f => path.relative(REPO, f))).toEqual([])
  })

  test('the self-hosted Red Hat Mono files ship with their licence', () => {
    const dir = path.join(REPO, 'apps', 'web', 'public', 'fonts')
    expect(fontFiles(dir).length).toBeGreaterThanOrEqual(2)
    const lic = fs.readFileSync(path.join(dir, 'OFL-RedHatMono.txt'), 'utf8')
    expect(lic).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/i)
  })

  test('the site loads fonts only from the Adobe kit and its own origin', () => {
    const doc = fs.readFileSync(path.join(REPO, 'apps', 'web', 'pages', '_document.js'), 'utf8')
    expect(doc).toContain('https://use.typekit.net/pww4pkx.css')
    expect(doc).not.toMatch(/googleapis|gstatic/)
    const css = fs.readFileSync(path.join(REPO, 'apps', 'web', 'styles', 'globals.css'), 'utf8')
    expect(css).not.toMatch(/googleapis|gstatic|Newsreader|IBM Plex/)
  })
})
