'use strict'

const Ajv = require('ajv')
const schema = require('./schema/skill.schema.json')

const ajv = new Ajv()
const validate = ajv.compile(schema)

function generateManifest(skill, baseUrl = 'https://skills.openskill.ai') {
  const host = baseUrl.replace(/\/$/, '')
  const mcpHost = host.replace(/^https?:\/\//, '')

  return {
    osk: '1.0',
    name: skill.name,
    version: skill.version,
    description: skill.description,
    frameworks: skill.frameworks || [],
    tags: skill.tags || [],
    phases: (skill.phases || []).map(({ id, lazy, tokens, ref }) => ({ id, lazy, tokens, ref })),
    endpoints: {
      mcp:       `mcp://${mcpHost}/${skill.name}`,
      action:    `${host}/${skill.name}/invoke`,
      artifacts: `${host}/${skill.name}/download`
    },
    research: skill['research-agent'] || skill.research || {}
  }
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
