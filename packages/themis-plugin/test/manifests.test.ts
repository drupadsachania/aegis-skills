import fs from 'node:fs'
import path from 'node:path'

const root = path.join(__dirname, '..')
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const pkg = read('package.json')

it('manifests agree on name and version', () => {
  expect(read('.claude-plugin/plugin.json').version).toBe(pkg.version)
  expect(read('server.json')).toMatchObject({ name: pkg.mcpName, version: pkg.version })
  expect(read('server.json').packages[0]).toMatchObject({ identifier: pkg.name, version: pkg.version })
})

it('.mcp.json launches exact-pinned packages (never ^ or ~)', () => {
  const servers = read('.mcp.json').mcpServers
  expect(servers.themis.args).toContain(`${pkg.name}@${pkg.version}`)
  for (const s of Object.values<{ args: string[] }>(servers)) {
    for (const a of s.args.filter((x) => x.includes('@') && !x.startsWith('-'))) expect(a).not.toMatch(/[\^~]/)
  }
})

it('server.json description fits the registry limit', () => {
  expect(read('server.json').description.length).toBeLessThanOrEqual(100)
})

it('ships the skill and both agents, and no Aegis skills', () => {
  for (const f of ['skills/themis-orchestrator/SKILL.md', 'skills/themis-orchestrator/skill.json', 'agents/themis-subtask-runner.md', 'agents/themis-guardrail-reviewer.md']) {
    expect(fs.existsSync(path.join(root, f))).toBe(true)
  }
  expect(fs.readdirSync(path.join(root, 'skills'))).toEqual(['themis-orchestrator'])
})

it('depends only on Themis packages, the MCP SDK and zod (no model SDKs, no native modules)', () => {
  expect(Object.keys(pkg.dependencies).sort()).toEqual(['@aegis-skills/themis-core', '@aegis-skills/themis-gateway', '@modelcontextprotocol/sdk', 'aegis-skills', 'zod'])
})
