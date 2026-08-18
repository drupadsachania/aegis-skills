#!/usr/bin/env node

const { program } = require('commander')
const path = require('path')
const pkg = require(path.join(__dirname, '..', 'package.json'))

// Subcommands
const initCmd = require('../lib/cli/init')
const configureCmd = require('../lib/cli/configure')
const listCmd = require('../lib/cli/list')
const compileCmd = require('../lib/cli/compile')

program
  .name('aegis')
  .description('Universal skill library for Claude, ChatGPT, Cursor, Gemini, and VS Code')
  .version(pkg.version)

program
  .command('init')
  .description('Initialize Aegis Skills with interactive setup for your tools')
  .action(initCmd)

program
  .command('configure')
  .description('Reconfigure Aegis Skills for a specific tool')
  .option('--for <tool>', 'Tool to configure (claude, chatgpt, cursor, gemini, vscode)')
  .action(configureCmd)

program
  .command('list')
  .description('List installed skills and their status')
  .action(listCmd)

program
  .command('compile [skill]')
  .description('Compile skill artifacts (all skills, or a named skill)')
  .action(compileCmd)

program
  .command('intel-sync')
  .description('Sync threat intel into skills from the local corpus, then compile')
  .option('-d, --days <n>', 'lookback window in days', '7')
  .option('--dry-run', 'show routing without writing anything')
  .option('--news <dir>', 'daily article feed directory')
  .option('--breakdowns <dir>', 'attack-breakdown directory')
  .option('--no-compile', 'skip recompiling artifacts afterwards')
  .action(require('../lib/cli/intel-sync'))

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
