'use strict'

const BASE_URL = 'https://project-iud7o.vercel.app'

function buildMcpManifest(skill, baseUrl = BASE_URL) {
  const host = baseUrl.replace(/\/$/, '')

  return {
    schema: 'mcp/1.0',
    name: skill.name,
    version: skill.version,
    description: skill.description,
    tools: [
      {
        name: 'invoke',
        description: `Run a phase of the ${skill.name} skill workflow`,
        inputSchema: {
          type: 'object',
          required: ['phase'],
          properties: {
            phase: {
              type: 'string',
              description: 'Phase ID to load',
              enum: skill.phases.map(p => p.id)
            }
          }
        }
      }
    ],
    resources: skill.phases.map(phase => ({
      uri:         `${host}/${skill.name}/phase/${phase.id}`,
      name:        phase.id,
      description: `Reference content for ${skill.name} — ${phase.id}`,
      mimeType:    'text/markdown'
    }))
  }
}

module.exports = { buildMcpManifest }
