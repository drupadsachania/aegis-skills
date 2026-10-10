import fs from 'node:fs'
import path from 'node:path'

const APP = path.join(__dirname, '..', '..')
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))

describe('dashboard UI source rules', () => {
  const files = walk(path.join(APP, 'ui', 'src')).filter((f) => /\.(tsx?|css)$/.test(f))
  it('never injects HTML or evaluates code', () => {
    for (const f of files) expect(fs.readFileSync(f, 'utf8')).not.toMatch(/dangerouslySetInnerHTML|innerHTML|eval\(|new Function\(/)
  })
  it('loads nothing from other origins', () => {
    for (const f of files) expect(fs.readFileSync(f, 'utf8')).not.toMatch(/https?:\/\/(?!127\.0\.0\.1|localhost)[^'"\s]*\.(js|css|woff2?)/)
  })
})

const built = path.join(APP, 'dist', 'ui', 'index.html')
const describeBuilt = fs.existsSync(built) ? describe : describe.skip
describeBuilt('built dashboard (dist/ui)', () => {
  const html = fs.existsSync(built) ? fs.readFileSync(built, 'utf8') : ''
  it('has no inline scripts or inline styles (CSP script-src/style-src self)', () => {
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/)
    expect(html).not.toMatch(/\sstyle=/)
    expect(html).not.toMatch(/<style/)
  })
  it('references only files that exist', () => {
    for (const ref of html.match(/(?:src|href)="\/(assets\/[^"]+)"/g) ?? []) {
      const rel = /"\/(assets\/[^"]+)"/.exec(ref)![1]
      expect(fs.existsSync(path.join(APP, 'dist', 'ui', rel))).toBe(true)
    }
  })
})
