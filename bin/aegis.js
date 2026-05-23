#!/usr/bin/env node
'use strict'

const { Command } = require('commander')
const path = require('path')
const { compile } = require('../src/compiler')

const program = new Command()

program
  .name('aegis')
  .description('Aegis compiler — converts SKILL.md bundles to platform artifacts')
  .version('0.1.0')

program
  .command('compile <skillDir>')
  .description('Compile a skill bundle into platform artifacts')
  .option('--base-url <url>', 'base URL for endpoints', 'https://project-iud7o.vercel.app')
  .option('--out-dir <dir>',  'output directory for artifacts')
  .action(async (skillDir, opts) => {
    try {
      const absDir = path.resolve(skillDir)
      const result = await compile(absDir, {
        baseUrl: opts.baseUrl,
        outDir: opts.outDir ? path.resolve(opts.outDir) : null
      })
      console.log(`✓ ${result.skill.name} v${result.skill.version} compiled (${result.skill.phases.length} phases)`)
    } catch (err) {
      console.error(`✗ Compile failed: ${err.message}`)
      process.exit(1)
    }
  })

program.parseAsync(process.argv)
