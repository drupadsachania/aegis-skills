'use strict'

const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..', '..')

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, script), ...args], {
      cwd: ROOT,
      stdio: 'inherit'
    })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`)))
  })
}

// `aegis intel-sync` — ingest the local threat-intel corpus, route it into the
// skills it belongs to, then recompile so the artifacts carry the new intel.
module.exports = async function intelSyncCmd(opts = {}) {
  const args = ['--days', String(opts.days || 7)]
  if (opts.dryRun) args.push('--dry-run')
  if (opts.news) args.push('--news', opts.news)
  if (opts.breakdowns) args.push('--breakdowns', opts.breakdowns)

  try {
    await run('scripts/intel-sync.js', args)
    // commander sets opts.compile === false when --no-compile is passed.
    if (opts.compile !== false && !opts.dryRun) {
      console.log('\nRecompiling skill artifacts...')
      await run('bin/aegis.js', ['compile'])
    }
  } catch (e) {
    console.error(`✗ intel-sync failed: ${e.message}`)
    process.exit(1)
  }
}
