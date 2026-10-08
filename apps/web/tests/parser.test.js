const { parseSkill } = require('../src/parser')
const path = require('path')

const FIXTURE = path.join(__dirname, 'fixtures/test-skill')

describe('parseSkill', () => {
  let skill

  beforeAll(async () => {
    skill = await parseSkill(FIXTURE)
  })

  test('reads name from frontmatter', () => {
    expect(skill.name).toBe('test-skill')
  })

  test('reads version from frontmatter', () => {
    expect(skill.version).toBe('1.0.0')
  })

  test('reads description from frontmatter', () => {
    expect(skill.description).toMatch(/minimal test skill/)
  })

  test('reads frameworks array', () => {
    expect(skill.frameworks).toEqual(['mitre-attack'])
  })

  test('reads phases with ref and lazy flag', () => {
    expect(skill.phases).toHaveLength(1)
    expect(skill.phases[0].id).toBe('phase-zero')
    expect(skill.phases[0].lazy).toBe(true)
  })

  test('reads body content', () => {
    expect(skill.body).toContain('This is the main body')
    expect(skill.body).toContain('Core Principle')
  })

  test('loads reference file content', () => {
    expect(skill.phases[0].content).toContain('Phase 0')
    expect(skill.phases[0].content).toContain('reference content for phase zero')
  })

  test('counts tokens for body', () => {
    expect(typeof skill.bodyTokens).toBe('number')
    expect(skill.bodyTokens).toBeGreaterThan(0)
  })

  test('counts tokens for each phase reference', () => {
    expect(typeof skill.phases[0].tokens).toBe('number')
    expect(skill.phases[0].tokens).toBeGreaterThan(0)
  })

  test('throws if SKILL.md does not exist', async () => {
    await expect(parseSkill('/nonexistent/path')).rejects.toThrow('SKILL.md not found')
  })

  test('throws if phase ref file does not exist', async () => {
    const badFixture = path.join(__dirname, 'fixtures/test-skill-bad')
    await expect(parseSkill(badFixture)).rejects.toThrow()
  })
})
