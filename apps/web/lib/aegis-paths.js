'use strict'

/**
 * Where the Aegis skill pack lives, as seen from the website (restructure Phase 0).
 *
 * The site reads skills from disk at runtime, and Next.js bundles this module, so
 * __dirname is unreliable here. Resolution uses process.cwd() instead:
 *   - cwd is apps/web (next dev/build/start, Vercel functions, jest inside apps/web)
 *       -> the repo root is two levels up;
 *   - any other cwd (root `npx jest` via projects, CLI started from the root)
 *       -> the cwd is the repo root.
 * AEGIS_PACKAGE_DIR overrides both. Uses `path` only, never `fs`: tests mock fs.
 */
const path = require('path')

function repoRoot () {
  const cwd = path.resolve(process.cwd())
  if (path.basename(cwd) === 'web' && path.basename(path.dirname(cwd)) === 'apps') {
    return path.resolve(cwd, '..', '..')
  }
  return cwd
}

function aegisDir () {
  if (process.env.AEGIS_PACKAGE_DIR) return path.resolve(process.env.AEGIS_PACKAGE_DIR)
  return path.join(repoRoot(), 'packages', 'aegis')
}

function skillsDir () { return path.join(aegisDir(), 'skills') }
function healthFile () { return path.join(aegisDir(), 'health.json') }

module.exports = { repoRoot, aegisDir, skillsDir, healthFile }
