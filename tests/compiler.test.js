const { buildSystemPrompt } = require('../src/adapters/system-prompt')
const { parseSkill } = require('../src/parser')
const path = require('path')

const FIXTURE = path.join(__dirname, 'fixtures/test-skill')

describe('buildSystemPrompt', () => {
  let skill, prompt

  beforeAll(async () => {
    skill = await parseSkill(FIXTURE)
    prompt = buildSystemPrompt(skill)
  })

  test('includes skill body', () => {
    expect(prompt).toContain('This is the main body')
  })

  test('includes all phase reference content', () => {
    expect(prompt).toContain('Phase 0 — Setup')
    expect(prompt).toContain('reference content for phase zero')
  })

  test('includes phase separator headers', () => {
    expect(prompt).toContain('## phase-zero')
  })

  test('is a non-empty string', () => {
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(50)
  })

  test('does not contain YAML frontmatter delimiters', () => {
    expect(prompt).not.toMatch(/^---/m)
  })
})

const { buildMcpManifest } = require('../src/adapters/mcp')

describe('buildMcpManifest', () => {
  let skill, manifest

  beforeAll(async () => {
    skill = await parseSkill(FIXTURE)
    manifest = buildMcpManifest(skill)
  })

  test('has correct MCP schema version', () => {
    expect(manifest.schema).toBe('mcp/1.0')
  })

  test('includes skill name and description', () => {
    expect(manifest.name).toBe('test-skill')
    expect(manifest.description).toMatch(/minimal test skill/)
  })

  test('exposes invoke as a tool', () => {
    const tool = manifest.tools.find(t => t.name === 'invoke')
    expect(tool).toBeDefined()
    expect(tool.inputSchema.properties.phase).toBeDefined()
  })

  test('exposes each phase as a resource', () => {
    expect(manifest.resources).toHaveLength(1)
    expect(manifest.resources[0].uri).toContain('test-skill/phase/phase-zero')
    expect(manifest.resources[0].name).toBe('phase-zero')
  })

  test('is valid JSON', () => {
    expect(() => JSON.stringify(manifest)).not.toThrow()
  })
})

const { buildOpenAiAction } = require('../src/adapters/openai-action')

describe('buildOpenAiAction', () => {
  let skill, spec

  beforeAll(async () => {
    skill = await parseSkill(FIXTURE)
    spec = buildOpenAiAction(skill)
  })

  test('is valid OpenAPI 3.1 structure', () => {
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.info.title).toContain('test-skill')
    expect(spec.paths).toBeDefined()
  })

  test('has invoke endpoint', () => {
    expect(spec.paths['/test-skill/invoke']).toBeDefined()
    expect(spec.paths['/test-skill/invoke'].post).toBeDefined()
  })

  test('invoke endpoint accepts phase parameter', () => {
    const body = spec.paths['/test-skill/invoke'].post.requestBody
    expect(body.content['application/json'].schema.properties.phase).toBeDefined()
  })

  test('servers points to openskill.ai', () => {
    expect(spec.servers[0].url).toBe('https://skills.openskill.ai')
  })
})
