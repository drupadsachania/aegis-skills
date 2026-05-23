'use strict'

const Ajv = require('ajv')
const schema = require('./schema/skill.schema.json')

const ajv = new Ajv()
const validate = ajv.compile(schema)

function generateManifest(skill, baseUrl = 'https://project-iud7o.vercel.app') {
  const host = baseUrl.replace(/\/$/, '')
  const mcpHost = host.replace(/^https?:\/\//, '')

  const manifest = {
    osk: '1.0',
    name: skill.name,
    version: skill.version,
    description: skill.description,
    frameworks: skill.frameworks || [],
    tags: skill.tags || [],
    phases: (skill.phases || []).map(({ id, lazy, tokens }) => ({ id, lazy, tokens })),
    endpoints: {
      mcp:       `mcp://${mcpHost}/${skill.name}`,
      action:    `${host}/${skill.name}/invoke`,
      artifacts: `${host}/${skill.name}/download`
    },
    research: skill['research-agent'] || skill.research || {}
  }

  if (skill['self-learning']) {
    manifest['self-learning'] = skill['self-learning']
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
