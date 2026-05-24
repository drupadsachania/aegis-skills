'use strict'

const fs = require('fs').promises
const path = require('path')
const { parseSkill } = require('./parser')
const { generateManifest, validateManifest } = require('./manifest')
const { buildSystemPrompt } = require('./adapters/system-prompt')
const { buildMcpManifest } = require('./adapters/mcp')
const { buildOpenAiAction } = require('./adapters/openai-action')

async function compile(skillDir, options = {}) {
  const baseUrl = options.baseUrl || 'https://aegis-skills.vercel.app'
  const outDir  = options.outDir  || path.join(skillDir, 'artifacts')

  const skill    = await parseSkill(skillDir)
  const manifest = generateManifest(skill, baseUrl)
  validateManifest(manifest)

  await fs.mkdir(outDir, { recursive: true })

  const artifacts = {
    'system-prompt.txt':    buildSystemPrompt(skill),
    'mcp-manifest.json':    JSON.stringify(buildMcpManifest(skill, baseUrl), null, 2),
    'openai-action.json':   JSON.stringify(buildOpenAiAction(skill, baseUrl), null, 2),
    'skill.json':           JSON.stringify(manifest, null, 2)
  }

  await Promise.all(
    Object.entries(artifacts).map(([filename, content]) =>
      fs.writeFile(path.join(outDir, filename), content, 'utf8')
    )
  )

  await fs.writeFile(path.join(skillDir, 'skill.json'), artifacts['skill.json'], 'utf8')

  return { skill, manifest, outDir, files: Object.keys(artifacts) }
}

module.exports = { compile }
