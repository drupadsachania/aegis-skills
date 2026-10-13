'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { buildDownloads } = require('../../lib/downloads')
const { loadFlattener } = require('../../lib/flat-prompt')
const { SKILLS_DIR, aegisVersion } = require('../../lib/site-paths')
const { readZip } = require('../helpers/read-zip')

jest.setTimeout(60000)

test('every real skill gets a stamped prompt and a clean zip', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-real-'))
  try {
    const index = await buildDownloads({ skillsDir: SKILLS_DIR, outDir: out, flatten: loadFlattener(), aegisVersion: aegisVersion() })
    const expected = fs.readdirSync(SKILLS_DIR).filter(n => fs.existsSync(path.join(SKILLS_DIR, n, 'SKILL.md')))
    expect(index.skills).toHaveLength(expected.length)
    expect(index.skills.length).toBe(24)
    for (const s of index.skills) {
      const prompt = fs.readFileSync(path.join(out, 'prompts', `${s.name}.md`), 'utf8')
      expect(prompt).toMatch(/intel as of/i)
      const names = readZip(fs.readFileSync(path.join(out, 'skills', `${s.name}.zip`))).map(e => e.name)
      expect(names).toContain(`${s.name}/SKILL.md`)
      expect(names).toContain(`${s.name}/skill.json`)
      expect(names.some(n => /intel-state\.json|\/artifacts\//.test(n))).toBe(false)
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
})
