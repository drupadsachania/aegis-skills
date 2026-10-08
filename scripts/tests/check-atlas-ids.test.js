'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { atlasNames, scan, check } = require('../check-atlas-ids')

const YAML = `format-version: 6.0.0
tactics:
  AML.TA0002:
    name: Reconnaissance
techniques:
  AML.T0015:
    name: Evade AI Model
  AML.T0024.001:
    name: Invert AI Model
`

test('atlasNames maps every tactic and technique id to its name', () => {
  expect(atlasNames(YAML)).toEqual({ 'AML.TA0002': 'Reconnaissance', 'AML.T0015': 'Evade AI Model', 'AML.T0024.001': 'Invert AI Model' })
})

test('flags unknown ids and lines without the official name', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-atlas-')), 'demo')
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), [
    '| Evade AI Model | AML.T0015 | ok |',
    '| Model Inversion | AML.T0040 | wrong |',
    '| Invert AI Model | AML.T0024.001 | ok |',
    '### Recon (AML.TA0002)'
  ].join('\n'))
  const problems = check(atlasNames(YAML), scan(path.dirname(dir)))
  expect(problems.map(p => `${p.kind} ${p.id} ${p.line}`)).toEqual(['unknown AML.T0040 2', 'name AML.TA0002 4'])
})
