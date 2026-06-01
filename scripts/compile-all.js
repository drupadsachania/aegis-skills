'use strict'
const path = require('path')
const { compile } = require('../src/compiler')
const fs = require('fs').promises

async function main() {
  const skillsDir = path.join(__dirname, '..', 'skills')
  const entries = await fs.readdir(skillsDir, { withFileTypes: true })
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name)
  let ok = 0, fail = 0
  for (const dir of dirs) {
    try {
      const result = await compile(path.join(skillsDir, dir))
      console.log(`✓ ${dir} — ${result.files.join(', ')}`)
      ok++
    } catch (e) {
      console.error(`✗ ${dir}: ${e.message}`)
      fail++
    }
  }
  console.log(`\nDone: ${ok} compiled, ${fail} failed`)
}
main().catch(err => { console.error(err); process.exit(1) })
