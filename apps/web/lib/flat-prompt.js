'use strict'

const path = require('path')
const { REPO_ROOT } = require('./site-paths')

// Phase 1 owns flattening (every phase of a skill in one markdown file).
// Contract: flattenSkill(absoluteSkillDir) → string | Promise<string>.
function loadFlattener () {
  const mod = require(path.join(REPO_ROOT, 'scripts', 'build-flat-prompts.js'))
  const fn = mod.flattenSkill // PHASE-1 BINDING
  if (typeof fn !== 'function') {
    throw new Error('scripts/build-flat-prompts.js must export flattenSkill(skillDir)')
  }
  return fn
}

module.exports = { loadFlattener }
