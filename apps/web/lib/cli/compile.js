'use strict'
const path = require('path')
const { compile } = require('../../src/compiler')
const fs = require('fs').promises

module.exports = async function compileCmd(skillName) {
  // apps/web/lib/cli -> repo root is four levels up
  const skillsDir = path.join(__dirname, '..', '..', '..', '..', 'packages', 'aegis', 'skills')

  if (skillName) {
    const skillDir = path.join(skillsDir, skillName)
    try {
      const result = await compile(skillDir)
      console.log(`✓ Compiled ${skillName}: ${result.files.join(', ')}`)
    } catch (e) {
      console.error(`✗ Failed: ${e.message}`)
      process.exit(1)
    }
  } else {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name)
    let ok = 0, fail = 0
    for (const dir of dirs) {
      try {
        await compile(path.join(skillsDir, dir))
        console.log(`✓ ${dir}`)
        ok++
      } catch (e) {
        console.error(`✗ ${dir}: ${e.message}`)
        fail++
      }
    }
    console.log(`\nCompiled ${ok}/${ok + fail} skills`)
    if (fail > 0) process.exit(1)
  }
}
