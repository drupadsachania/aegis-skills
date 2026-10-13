#!/usr/bin/env node
'use strict'

const { parseArgs } = require('node:util')
const PKG = require('../package.json')

const HELP = `aegis ${PKG.version}: Aegis defensive security skill pack

Usage:
  aegis install [--platform <id>[,<id>...]|all] [--project] [--dir <path>]
                [--no-mcp] [--mcp npx|local] [--force]
  aegis init                      alias of install
  aegis uninstall [--platform <id>[,<id>...]] [--project] [--dir <path>]
  aegis update                    re-sync every recorded install now
  aegis list [--json]             bundled skills and recorded installs
  aegis mcp                       serve the skills over MCP on stdio
  aegis --version

Platforms: claude, codex, gemini, cursor, vscode, antigravity
Without --platform, install targets every platform found in your home folder.
--project installs into the current folder (or --dir) instead of your user folder.
Set AEGIS_NO_AUTO_REFRESH=1 to turn off the automatic refresh after upgrades.
`

const OPTIONS = {
  platform: { type: 'string' },
  project: { type: 'boolean', default: false },
  dir: { type: 'string' },
  'no-mcp': { type: 'boolean', default: false },
  mcp: { type: 'string', default: 'npx' },
  force: { type: 'boolean', default: false },
  json: { type: 'boolean', default: false }
}
const COMMANDS = ['install', 'init', 'uninstall', 'update', 'list', 'mcp']

function usage (msg) {
  const e = new Error(msg)
  e.code = 'AEGIS_USAGE'
  return e
}

function platformList (value, ids) {
  if (!value) return null
  if (value === 'all') return ids.slice()
  const list = value.split(',').map(s => s.trim()).filter(Boolean)
  for (const p of list) if (!ids.includes(p)) throw usage(`unknown platform "${p}". Use one of: ${ids.join(', ')}`)
  return list
}

async function main (argv) {
  const [cmd, ...rest] = argv
  if (!cmd || ['help', '--help', '-h'].includes(cmd)) { process.stdout.write(HELP); return 0 }
  if (['--version', '-v', 'version'].includes(cmd)) { process.stdout.write(PKG.version + '\n'); return 0 }
  if (!COMMANDS.includes(cmd)) throw usage(`unknown command "${cmd}"`)

  const installer = require('../lib/installer')
  const { PLATFORM_IDS } = require('../lib/targets')
  const out = m => process.stdout.write(m + '\n')
  const err = m => process.stderr.write(m + '\n')

  if (cmd === 'mcp') {
    installer.refreshIfStale(err) // stdout carries JSON-RPC
    await require('../mcp/stdio').runStdio()
    return null
  }
  if (cmd !== 'update') installer.refreshIfStale(err)

  let values
  try { ({ values } = parseArgs({ args: rest, options: OPTIONS, allowPositionals: false })) } catch (e) { throw usage(e.message) }
  if (!['npx', 'local'].includes(values.mcp)) throw usage('--mcp must be "npx" or "local"')
  const opts = { project: values.project, dir: values.dir || process.cwd(), force: values.force, mcp: !values['no-mcp'], mcpMode: values.mcp, log: out }

  if (cmd === 'install' || cmd === 'init') {
    let platforms = platformList(values.platform, PLATFORM_IDS)
    if (!platforms) {
      platforms = installer.detectPlatforms()
      if (!platforms.length) { err(`aegis: no supported tool found in your home folder. Pass --platform <${PLATFORM_IDS.join('|')}>.`); return 1 }
      out(`Detected: ${platforms.join(', ')}`)
    }
    installer.install(platforms, opts)
    return 0
  }
  if (cmd === 'uninstall') { installer.uninstall(platformList(values.platform, PLATFORM_IDS), opts); return 0 }
  if (cmd === 'update') { installer.update(opts); return 0 }

  const info = installer.listing()
  if (values.json) { out(JSON.stringify(info, null, 2)); return 0 }
  out(`aegis-skills ${info.version}: ${info.bundled.length} skills bundled`)
  if (!info.installs.length) out('No installs recorded. Run: aegis install --platform <id>')
  for (const e of info.installs) out(`  ${e.platform.padEnd(12)} ${e.scope.padEnd(8)} v${e.version}  ${e.skills} skills  ${e.skillsDir}`)
  return 0
}

main(process.argv.slice(2)).then(
  code => { if (code !== null) process.exitCode = code },
  e => {
    process.stderr.write(`aegis: ${e.message}\n`)
    if (e.code === 'AEGIS_USAGE') process.stderr.write('\n' + HELP)
    process.exitCode = e.code === 'AEGIS_USAGE' ? 2 : 1
  }
)
