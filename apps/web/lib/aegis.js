'use strict'

// Single entry point from the website into the Aegis package.
// Runtime-safe (API routes) and build-time-safe (getStaticProps).
// Never import the MCP server from here: pages must not bundle the MCP SDK.
const reader = require('aegis-skills/mcp/skill-reader')     // PHASE-1 BINDING
const families = require('aegis-skills/mcp/skill-families') // PHASE-1 BINDING

// The site serves only these public fields. Anything else the reader returns is internal data
// and must never reach a page or an API response (Phase 5 amendment).
const PUBLIC_FIELDS = ['name', 'version', 'description', 'frameworks', 'tags', 'phases', 'authoredPhases', 'live', 'context']

async function listSkills (...args) {
  const skills = await reader.listSkills(...args)
  return skills.map(s => Object.fromEntries(PUBLIC_FIELDS.filter(k => k in s).map(k => [k, s[k]])))
}

module.exports = {
  listSkills,
  getSkillManifest: reader.getSkillManifest,
  getPhaseContent: reader.getPhaseContent,
  getPhaseRef: reader.getPhaseRef,
  FAMILIES: families.FAMILIES,
  familyOf: families.familyOf,
  labelOf: families.labelOf
}
