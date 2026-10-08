'use strict'

/**
 * Aegis MCP server — exposes the skill library over the real Model Context
 * Protocol (JSON-RPC), replacing the custom mcp-manifest.json format for
 * clients that speak MCP (Claude Desktop, Claude Code, Cursor, …).
 *
 * One factory, two transports:
 *   • `aegis mcp`      → stdio, for local clients            (lib/cli/mcp.js)
 *   • POST /api/mcp    → stateless Streamable HTTP, for remote (app/api/mcp/route.ts)
 *
 * Every tool is READ-ONLY and serves only public skill content that is already
 * published on the website. Nothing here writes, executes or reaches the
 * network. All lookups go through skill-reader, which validates skill names
 * and keeps phase file resolution inside the skills directory.
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js')
const { z } = require('zod')
const { listSkills, getSkillManifest, getPhaseContent } = require('../skill-reader')
const { FAMILIES, familyOf, labelOf } = require('../skill-families')
const pkg = require('../../package.json')

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/
const FAMILY_KEYS = FAMILIES.map(f => f.key)
const MAX_PHASE_CHARS = 20000

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }

function text(t) {
  return { content: [{ type: 'text', text: t }] }
}

function errorResult(message) {
  return { content: [{ type: 'text', text: message }], isError: true }
}

function firstSentence(desc) {
  const flat = String(desc || '').replace(/\s+/g, ' ').trim()
  const cut = flat.split(/\.\s|\. Triggers|Triggers for:/)[0]
  return cut.length > 200 ? cut.slice(0, 200).trimEnd() + '…' : cut
}

// Phases may be requested by id ("edr-deployment") or 0-based authored index ("0").
function resolvePhase(manifest, phase) {
  const authored = (manifest.phases || []).filter(p => !p.auto)
  if (/^\d+$/.test(phase)) {
    const hit = authored[Number(phase)]
    return hit ? hit.id : null
  }
  return (manifest.phases || []).some(p => p.id === phase) ? phase : null
}

function createAegisMcpServer() {
  const server = new McpServer(
    { name: 'aegis-skills', version: pkg.version },
    {
      instructions:
        'Aegis is a library of defensive security skills. Use list_skills to find a skill, ' +
        'get_skill to see its phases, and get_skill_phase to load the methodology for a phase.'
    }
  )

  server.registerTool(
    'list_skills',
    {
      title: 'List Aegis skills',
      description:
        'List available defensive security skills, optionally filtered by family or a free-text query ' +
        '(matched against name, description, tags and frameworks).',
      inputSchema: {
        query: z.string().max(200).optional().describe('Free-text filter'),
        family: z.enum(FAMILY_KEYS).optional().describe('Skill family: ' + FAMILY_KEYS.join(', '))
      },
      annotations: READ_ONLY
    },
    async ({ query, family }) => {
      const skills = await listSkills()
      const q = (query || '').trim().toLowerCase()
      const rows = skills
        .filter(s => !family || familyOf(s.name) === family)
        .filter(s => {
          if (!q) return true
          const hay = [s.name, s.description, (s.tags || []).join(' '), (s.frameworks || []).join(' ')]
            .join(' ').toLowerCase()
          return hay.includes(q)
        })
        .map(s => ({
          name: s.name,
          family: labelOf(familyOf(s.name)),
          summary: firstSentence(s.description),
          phases: s.authoredPhases != null ? s.authoredPhases : s.phases,
          liveIntel: Boolean(s.live)
        }))
      return text(JSON.stringify({ count: rows.length, skills: rows }, null, 2))
    }
  )

  server.registerTool(
    'get_skill',
    {
      title: 'Get an Aegis skill',
      description: 'Return a skill\'s description, frameworks, tags, context and ordered phase ids.',
      inputSchema: {
        name: z.string().regex(SLUG).describe('Skill slug, e.g. "exposure-validation"')
      },
      annotations: READ_ONLY
    },
    async ({ name }) => {
      const manifest = await getSkillManifest(name)
      if (!manifest) return errorResult(`Unknown skill "${name}". Use list_skills to see available skills.`)
      return text(JSON.stringify({
        name: manifest.name,
        version: manifest.version,
        family: labelOf(familyOf(manifest.name)),
        description: String(manifest.description || '').replace(/\s+/g, ' ').trim(),
        frameworks: manifest.frameworks || [],
        tags: manifest.tags || [],
        context: manifest.context || null,
        phases: (manifest.phases || []).map((p, i) => ({
          index: i,
          id: p.id,
          liveIntel: Boolean(p.auto)
        }))
      }, null, 2))
    }
  )

  server.registerTool(
    'get_skill_phase',
    {
      title: 'Load a skill phase',
      description:
        'Load the methodology content for one phase of a skill. ' +
        'Pass the phase id from get_skill, or its 0-based index among authored phases.',
      inputSchema: {
        name: z.string().regex(SLUG).describe('Skill slug'),
        phase: z.string().min(1).max(80).describe('Phase id (e.g. "edr-deployment") or index (e.g. "0")')
      },
      annotations: READ_ONLY
    },
    async ({ name, phase }) => {
      const manifest = await getSkillManifest(name)
      if (!manifest) return errorResult(`Unknown skill "${name}".`)
      const phaseId = resolvePhase(manifest, phase)
      if (!phaseId) {
        const ids = (manifest.phases || []).map(p => p.id).join(', ')
        return errorResult(`Unknown phase "${phase}" for ${name}. Available: ${ids}`)
      }
      const content = await getPhaseContent(name, phaseId)
      if (content == null) return errorResult(`Phase "${phaseId}" of ${name} is not available.`)
      const body = content.length > MAX_PHASE_CHARS
        ? content.slice(0, MAX_PHASE_CHARS) + '\n\n[truncated]'
        : content
      return text(body)
    }
  )

  return server
}

module.exports = { createAegisMcpServer }
