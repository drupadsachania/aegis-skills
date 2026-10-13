#!/usr/bin/env node
'use strict'

/**
 * MCP Registry metadata guard. For each package that has a server.json:
 *   - description is 100 characters or fewer (registry limit)
 *   - server.json "name" starts with the GitHub namespace io.github.drupadsachania/
 *   - package.json "mcpName" exists and equals server.json "name" (the registry checks this on publish)
 *   - server.json "version" and every npm package "version" equal the package.json version
 *   - every npm package "identifier" equals the package.json name
 * Prints each problem and exits 1 on failure.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const NAMESPACE = 'io.github.drupadsachania/'
const MAX_DESCRIPTION = 100
const PACKAGES = ['packages/aegis', 'packages/themis-plugin']

function readJson (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function checkPackage (dir) {
  const errors = []
  let pkg, server
  try { pkg = readJson(path.join(dir, 'package.json')) } catch (e) { return [`package.json unreadable: ${e.message}`] }
  try { server = readJson(path.join(dir, 'server.json')) } catch (e) { return [`server.json unreadable: ${e.message}`] }

  if (typeof server.description !== 'string' || !server.description) errors.push('server.json description is missing')
  else if (server.description.length > MAX_DESCRIPTION) errors.push(`server.json description is ${server.description.length} characters (max ${MAX_DESCRIPTION})`)

  if (typeof server.name !== 'string' || !server.name.startsWith(NAMESPACE)) errors.push(`server.json name "${server.name}" must start with ${NAMESPACE}`)
  if (!pkg.mcpName) errors.push('package.json has no mcpName')
  else if (pkg.mcpName !== server.name) errors.push(`package.json mcpName "${pkg.mcpName}" must equal server.json name "${server.name}"`)

  if (server.version !== pkg.version) errors.push(`server.json version "${server.version}" must equal package.json version "${pkg.version}"`)
  for (const p of server.packages || []) {
    if (p.registryType !== 'npm') continue
    if (p.identifier !== pkg.name) errors.push(`server.json package identifier "${p.identifier}" must equal package name "${pkg.name}"`)
    if (p.version !== pkg.version) errors.push(`server.json package version "${p.version}" must equal package.json version "${pkg.version}"`)
  }
  return errors
}

function main () {
  let count = 0
  for (const rel of PACKAGES) {
    for (const e of checkPackage(path.join(ROOT, rel))) { console.error(`✗ ${rel}: ${e}`); count++ }
  }
  console.log(`check-registry-meta: ${count} problem(s)`)
  if (count > 0) process.exit(1)
}

if (require.main === module) main()

module.exports = { checkPackage, PACKAGES, NAMESPACE, MAX_DESCRIPTION }
