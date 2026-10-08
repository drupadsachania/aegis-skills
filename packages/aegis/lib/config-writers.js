'use strict'

/**
 * Register / unregister the Aegis MCP server in a platform's own config file.
 * Rules: never clobber user config; merge only our key; copy the previous file
 * to "<file>.aegis.bak" before every change; write atomically; refuse files we
 * cannot parse (JSON with comments, broken JSON) and leave them untouched.
 */

const fs = require('fs')
const path = require('path')

const MARK = '# managed by aegis-skills'

function atomicWrite (file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.aegis-tmp-${process.pid}`
  fs.writeFileSync(tmp, text, 'utf8')
  fs.renameSync(tmp, file)
}

function backup (file) {
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.aegis.bak`)
}

function readJson (file) {
  if (!fs.existsSync(file)) return {}
  const raw = fs.readFileSync(file, 'utf8')
  if (!raw.trim()) return {}
  try {
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('top level is not an object')
    return v
  } catch (e) {
    const err = new Error(`Refusing to edit ${file}: it is not plain JSON (${e.message}). Add the "aegis" server by hand.`)
    err.code = 'AEGIS_UNPARSEABLE'
    throw err
  }
}

function upsertJsonServer (file, key, name, entry) {
  const data = readJson(file)
  const servers = data[key] && typeof data[key] === 'object' ? data[key] : {}
  if (JSON.stringify(servers[name]) === JSON.stringify(entry)) return false
  backup(file)
  data[key] = { ...servers, [name]: entry }
  atomicWrite(file, JSON.stringify(data, null, 2) + '\n')
  return true
}

function removeJsonServer (file, key, name) {
  if (!fs.existsSync(file)) return false
  const data = readJson(file)
  if (!data[key] || typeof data[key] !== 'object' || !(name in data[key])) return false
  backup(file)
  delete data[key][name]
  atomicWrite(file, JSON.stringify(data, null, 2) + '\n')
  return true
}

const tomlString = s => JSON.stringify(String(s))

function tomlBlock (name, entry) {
  return [MARK, `[mcp_servers.${name}]`, `command = ${tomlString(entry.command)}`, `args = [${entry.args.map(tomlString).join(', ')}]`].join('\n') + '\n'
}

// Locate our table (and its sub-tables such as [mcp_servers.aegis.env]).
function findToml (lines, name) {
  const header = `[mcp_servers.${name}]`
  const start = lines.findIndex(l => l.trim() === header)
  if (start === -1) return null
  let s = start
  if (s > 0 && lines[s - 1].trim() === MARK) s--
  let e = start + 1
  while (e < lines.length) {
    const t = lines[e].trim()
    if (t === MARK || (t.startsWith('[') && !t.startsWith(`[mcp_servers.${name}.`))) break
    e++
  }
  return { s, e }
}

function joinParts (before, block, after) {
  const head = before.join('\n').trimEnd()
  const tail = after.join('\n').trim()
  return [head, block ? block.trimEnd() : '', tail].filter(Boolean).join('\n\n') + '\n'
}

function upsertTomlServer (file, name, entry) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : ''
  const lines = text.split('\n')
  const hit = findToml(lines, name)
  const next = hit
    ? joinParts(lines.slice(0, hit.s), tomlBlock(name, entry), lines.slice(hit.e))
    : joinParts(lines, tomlBlock(name, entry), [])
  if (next === text) return false
  backup(file)
  atomicWrite(file, next)
  return true
}

function removeTomlServer (file, name) {
  if (!fs.existsSync(file)) return false
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  const hit = findToml(lines, name)
  if (!hit) return false
  backup(file)
  atomicWrite(file, joinParts(lines.slice(0, hit.s), '', lines.slice(hit.e)))
  return true
}

module.exports = { upsertJsonServer, removeJsonServer, upsertTomlServer, removeTomlServer, readJson }
