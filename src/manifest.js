'use strict'

const Ajv = require('ajv')
const schema = require('./schema/skill.schema.json')

const ajv = new Ajv()
const validate = ajv.compile(schema)

function generateManifest(skill, baseUrl = 'https://aegis-skills.vercel.app') {
  const host = baseUrl.replace(/\/$/, '')
  const mcpHost = host.replace(/^https?:\/\//, '')

  const manifest = {
    osk: '1.0',
    name: skill.name,
    version: skill.version,
    description: skill.description,
    frameworks: skill.frameworks || [],
    tags: skill.tags || [],
    // `auto` marks machine-generated phases (e.g. the intel-sync live feed) so
    // downstream scoring can exclude them from authored-content metrics.
    phases: (skill.phases || []).map(({ id, lazy, tokens, auto }) =>
      auto ? { id, lazy, tokens, auto: true } : { id, lazy, tokens }
    ),
    endpoints: {
      mcp:       `mcp://${mcpHost}/${skill.name}`,
      action:    `${host}/${skill.name}/invoke`,
      artifacts: `${host}/${skill.name}/download`
    },
    research: skill['research-agent'] || skill.research || {}
  }

  if (skill['self-learning'] || skill.intelState) {
    // Curated frontmatter is the base; machine-maintained intel state overlays it.
    // Keeping them in separate files means a recompile can never wipe synced intel,
    // and intel-sync never has to rewrite hand-authored YAML.
    manifest['self-learning'] = {
      ...(skill['self-learning'] || {}),
      ...(skill.intelState || {})
    }
  }

  if (skill.context) {
    manifest.context = skill.context
  }

  return manifest
}

function validateManifest(manifest) {
  const valid = validate(manifest)
  if (!valid) {
    const errors = validate.errors.map(e => `${e.instancePath} ${e.message}`).join('; ')
    throw new Error(`Invalid skill.json: ${errors}`)
  }
  return true
}

module.exports = { generateManifest, validateManifest }
