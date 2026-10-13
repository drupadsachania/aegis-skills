#!/usr/bin/env node
'use strict'

const path = require('path')
const { SKILLS_DIR, DOWNLOADS_DIR, REPO_ROOT, assertRepoLayout, aegisVersion } = require('../lib/site-paths')
const { buildDownloads } = require('../lib/downloads')
const { loadFlattener } = require('../lib/flat-prompt')

async function main () {
  assertRepoLayout()
  const index = await buildDownloads({
    skillsDir: SKILLS_DIR,
    outDir: DOWNLOADS_DIR,
    flatten: loadFlattener(),
    aegisVersion: aegisVersion()
  })
  const rel = path.relative(REPO_ROOT, DOWNLOADS_DIR).split(path.sep).join('/')
  console.log(`build-downloads: ${index.skills.length} prompts + ${index.skills.length} zips -> ${rel}`)
}

main().catch(err => {
  console.error(`build-downloads: ${err.message}`)
  process.exit(1)
})
