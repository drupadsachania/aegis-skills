import fs from 'node:fs'
import path from 'node:path'

const UI = path.join(__dirname, '..', '..', 'ui')
const read = (p: string) => fs.readFileSync(path.join(UI, p), 'utf8')

describe('dashboard uses the shared Kairos design language', () => {
  const css = read('src/styles.css')
  it('is light by default: no prefers-color-scheme anywhere in UI source', () => {
    expect(css).not.toMatch(/@media[^{]*prefers-color-scheme/)
    for (const f of ['src/theme.ts', 'src/App.tsx', 'public/theme-init.v1.js']) {
      expect(read(f)).not.toMatch(/matchMedia\([^)]*prefers-color-scheme/)
    }
  })
  it('imports the shared tokens through the @design alias and uses them', () => {
    expect(read('src/main.tsx')).toContain("import '@design/tokens.css'")
    expect(read('vite.config.mts')).toContain("'@design'")
    expect(css).toContain('var(--k-color-bg)')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/) // no hard-coded colours
  })
  it('first-paint theme script is an external file (strict CSP) that only reads storage', () => {
    const html = read('index.html')
    expect(html).toMatch(/<script src="\/theme-init\.v1\.js"><\/script>/)
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/)
    expect(read('public/theme-init.v1.js')).toMatch(/getItem\('themis-theme'\) === 'dark'/)
  })
  it('all motion is reduced-motion gated and statuses carry a glyph and label', () => {
    expect(css).not.toMatch(/^\.page \{[^}]*animation/m)
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*k-pulse/)
    const badge = read('src/components/StatusBadge.tsx')
    for (const s of ['awaiting_approval', 'approved', 'rejected', 'failed', 'write', 'execute']) expect(badge).toContain(s)
    expect(badge).toContain('glyph')
  })
  it('does not load fonts or styles from other origins', () => {
    expect(css).not.toMatch(/@import|https?:\/\//)
  })
})
