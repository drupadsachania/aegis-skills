'use strict'

const BASE_URL = 'https://project-iud7o.vercel.app'

function buildOpenAiAction(skill, baseUrl = BASE_URL) {
  const host = baseUrl.replace(/\/$/, '')

  return {
    openapi: '3.1.0',
    info: {
      title: `${skill.name} skill`,
      description: skill.description,
      version: skill.version
    },
    servers: [{ url: host }],
    paths: {
      [`/${skill.name}/invoke`]: {
        post: {
          operationId: `invoke_${skill.name.replace(/-/g, '_')}`,
          summary: `Load a phase of the ${skill.name} skill`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['phase'],
                  properties: {
                    phase: {
                      type: 'string',
                      description: 'Which phase to load',
                      enum: skill.phases.map(p => p.id)
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Phase content returned as markdown',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      phase:   { type: 'string' },
                      content: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

module.exports = { buildOpenAiAction }
