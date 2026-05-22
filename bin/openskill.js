#!/usr/bin/env node
'use strict'

const { Command } = require('commander')
const path = require('path')
const { compile } = require('../src/compiler')

const program = new Command()

program
  .name('openskill')
  .description('OpenSkill compiler — converts SKILL.md bundles to platform artifacts')
  .version('0.1.0')

program
  .command('compile <skillDir>')
  .description('Compile a skill bundle into platform artifacts')
  .option('--base-url <url>', 'base URL for endpoints', 'https://skills.openskill.ai')
  .option('--out-dir <dir>',  'output directory for artifacts')
  .action(async (skillDir, opts) => {
    const resolved = path.resolve(skillDir)
    try {
      const result = await compile(resolved, {
        baseUrl: opts.baseUrl,
        outDir:  opts.outDir ? path.resolve(opts.outDir) : undefined
      })
      console.log(`✓ Compiled: ${result.skill.name}@${result.skill.version}`)
      console.log(`  Artifacts written to: ${result.outDir}`)
      result.files.forEach(f => console.log(`    ${f}`))
    } catch (err) {
      console.error(`✗ Compile failed: ${err.message}`)
      process.exit(1)
    }
  })

program
  .command('validate <skillDir>')
  .description('Validate a skill bundle without compiling')
  .action(async (skillDir) => {
    const { parseSkill } = require('../src/parser')
    const { generateManifest, validateManifest } = require('../src/manifest')
    const resolved = path.resolve(skillDir)
    try {
      const skill = await parseSkill(resolved)
      const manifest = generateManifest(skill)
      validateManifest(manifest)
      console.log(`✓ Valid: ${skill.name}@${skill.version} — ${skill.phases.length} phases`)
    } catch (err) {
      console.error(`✗ Invalid: ${err.message}`)
      process.exit(1)
    }
  })

program.parse()
