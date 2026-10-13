import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Gives each test its own THEMIS_HOME. */
export function useTempHome(): { dir: () => string } {
  let dir = ''
  const prev = process.env.THEMIS_HOME
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'themis-test-'))
    process.env.THEMIS_HOME = dir
  })
  afterEach(() => {
    if (prev === undefined) delete process.env.THEMIS_HOME
    else process.env.THEMIS_HOME = prev
    fs.rmSync(dir, { recursive: true, force: true })
  })
  return { dir: () => dir }
}

export interface FixtureSkill { name: string; phases: string[]; intel?: string; description?: string }

/** Writes a minimal Aegis-shaped package (contracts §5) and returns its root. */
export function makeSkillPack(skills: FixtureSkill[], version = '9.9.9'): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-fixture-'))
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'aegis-skills', version }))
  for (const s of skills) {
    const dir = path.join(root, 'skills', s.name)
    fs.mkdirSync(path.join(dir, 'references'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'skill.json'), JSON.stringify({
      osk: '1.1',
      name: s.name,
      description: s.description ?? `${s.name} skill`,
      phases: s.phases.map((id) => ({ id, file: `references/${id}.md`, tokens: 10 })),
    }))
    for (const id of s.phases) {
      fs.writeFileSync(path.join(dir, 'references', `${id}.md`), `# ${s.name} / ${id}\nMethodology text.`)
    }
    if (s.intel) fs.writeFileSync(path.join(dir, 'intel-state.json'), JSON.stringify({ 'last-intel-sync': s.intel }))
  }
  return root
}
