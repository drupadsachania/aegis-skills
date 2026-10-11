'use strict'

// Single entry point from the website into the Aegis package.
// Runtime-safe (API routes) and build-time-safe (getStaticProps).
// Never import the MCP server from here: pages must not bundle the MCP SDK.
const reader = require('aegis-skills/mcp/skill-reader')     // PHASE-1 BINDING
const families = require('aegis-skills/mcp/skill-families') // PHASE-1 BINDING

module.exports = {
  listSkills: reader.listSkills,
  getSkillManifest: reader.getSkillManifest,
  getPhaseContent: reader.getPhaseContent,
  getPhaseRef: reader.getPhaseRef,
  FAMILIES: families.FAMILIES,
  familyOf: families.familyOf,
  labelOf: families.labelOf
}
