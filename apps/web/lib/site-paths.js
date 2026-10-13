'use strict'

const fs = require('fs')
const path = require('path')

// Next.js and `npm run -w` run with cwd = apps/web; a root-level `npx jest`
// (projects) runs with cwd = repo root. Resolve the web root from either.
function findWebRoot (start = process.cwd()) {
  const fromRepo = path.join(start, 'apps', 'web')
  if (fs.existsSync(path.join(fromRepo, 'package.json'))) return fromRepo
  return start
}

const WEB_ROOT = findWebRoot()
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..')
const DOCS_DIR = path.join(REPO_ROOT, 'docs')
const AEGIS_DIR = path.join(REPO_ROOT, 'packages', 'aegis')
const SKILLS_DIR = path.join(AEGIS_DIR, 'skills')
const DOWNLOADS_DIR = path.join(WEB_ROOT, 'public', 'downloads')

function assertRepoLayout () {
  for (const p of [path.join(REPO_ROOT, 'SECURITY.md'), SKILLS_DIR, DOCS_DIR]) {
    if (!fs.existsSync(p)) throw new Error(`Expected repo path missing: ${p}`)
  }
}

function aegisVersion () {
  return JSON.parse(fs.readFileSync(path.join(AEGIS_DIR, 'package.json'), 'utf8')).version
}

module.exports = { findWebRoot, WEB_ROOT, REPO_ROOT, DOCS_DIR, AEGIS_DIR, SKILLS_DIR, DOWNLOADS_DIR, assertRepoLayout, aegisVersion }
