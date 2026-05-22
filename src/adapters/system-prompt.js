'use strict'

function buildSystemPrompt(skill) {
  const sections = [skill.body]

  for (const phase of skill.phases) {
    sections.push(`\n\n## ${phase.id}\n\n${phase.content}`)
  }

  return sections.join('\n').trim()
}

module.exports = { buildSystemPrompt }
