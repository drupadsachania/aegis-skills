'use strict'

const fs = require('fs').promises
const path = require('path')
const matter = require('gray-matter')

function estimateTokens(text) {
  return Math.ceil(text.length / 4)
}

async function parseSkill(skillDir) {
  const skillPath = path.join(skillDir, 'SKILL.md')

  let raw
  try {
    raw = await fs.readFile(skillPath, 'utf8')
  } catch {
    throw new Error(`SKILL.md not found at ${skillPath}`)
  }

  const { data: frontmatter, content: body } = matter(raw, {
    engines: {
      // Explicitly lock to js-yaml; disables the eval-based javascript engine
      javascript: () => { throw new Error('javascript front-matter engine is disabled') }
    }
  })

  const required = ['name', 'version', 'description', 'phases']
  for (const field of required) {
    if (!frontmatter[field]) throw new Error(`SKILL.md missing required field: ${field}`)
  }

  const phases = await Promise.all(
    (frontmatter.phases || []).map(async (phase) => {
      const refPath = path.join(skillDir, phase.ref)
      let content
      try {
        content = await fs.readFile(refPath, 'utf8')
      } catch {
        throw new Error(`Phase ref not found: ${phase.ref} (resolved: ${refPath})`)
      }
      return {
        ...phase,
        content,
        tokens: estimateTokens(content)
      }
    })
  )

  return {
    ...frontmatter,
    body: body.trim(),
    bodyTokens: estimateTokens(body),
    phases,
    skillDir
  }
}

module.exports = { parseSkill, estimateTokens }
