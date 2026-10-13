'use strict'

const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', '..', 'docs', 'listings', 'listing-copy.md')
const text = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')

const LIMITS = { name: 100, tagline: 55, description: 2000, categoriesMin: 1, categoriesMax: 5, chatgptShort: 30, chatgptLong: 4000, registry: 100 }

function section (heading, level = 2) {
  const marks = '#'.repeat(level)
  const start = text.indexOf(`\n${marks} ${heading}`)
  if (start < 0) throw new Error(`missing section: ${heading}`)
  const rest = text.slice(start + 1)
  const next = rest.slice(marks.length + 1).search(new RegExp(`\\n#{1,${level}} `))
  return next < 0 ? rest : rest.slice(0, next + marks.length + 1)
}

function tableRows (md) {
  return md.split('\n').filter(l => l.startsWith('|')).map(l => l.split('|').slice(1, -1).map(c => c.trim()))
    .filter(r => !r.every(c => /^-+$/.test(c))).slice(1)
}

const products = ['Aegis', 'Themis']

test('directory fields respect the Anthropic limits', () => {
  const rows = tableRows(section('Directory listing fields (Anthropic limits)'))
  expect(rows.map(r => r[0])).toEqual(products)
  for (const [, name, tagline, categories] of rows) {
    expect(name.length).toBeGreaterThan(0)
    expect(name.length).toBeLessThanOrEqual(LIMITS.name)
    expect(tagline.length).toBeGreaterThan(0)
    expect(tagline.length).toBeLessThanOrEqual(LIMITS.tagline)
    const cats = categories.split(',').map(c => c.trim()).filter(Boolean)
    expect(cats.length).toBeGreaterThanOrEqual(LIMITS.categoriesMin)
    expect(cats.length).toBeLessThanOrEqual(LIMITS.categoriesMax)
  }
})

test('long descriptions are within 2,000 characters', () => {
  const body = section('Long descriptions')
  for (const product of products) {
    const part = section(product, 3).split('\n').slice(1).join('\n')
    const desc = part.split('\n').filter(l => l.trim() && !/^\(about [\d,]+ characters\)$/.test(l.trim())).join('\n\n')
    expect(body).toContain(`### ${product}`)
    expect(desc.length).toBeGreaterThan(200)
    expect(desc.length).toBeLessThanOrEqual(LIMITS.description)
  }
})

test('one-liners fit the registry limit and ChatGPT short fields fit 30 characters', () => {
  for (const [, line] of tableRows(section('One-line descriptions (100 characters or fewer)'))) {
    expect(line.length).toBeLessThanOrEqual(LIMITS.registry)
  }
  const short = section('Names and category').length >= 0 && text.slice(text.indexOf('Short forms for places'))
  const rows = tableRows(short.slice(short.indexOf('|')))
  expect(rows.length).toBe(2)
  for (const [, display, desc] of rows) {
    expect(display.length).toBeLessThanOrEqual(LIMITS.chatgptShort)
    expect(desc.length).toBeLessThanOrEqual(LIMITS.chatgptShort)
  }
})

test('every listing has at least three example prompts', () => {
  const body = section('Example prompts (at least three per listing)')
  for (const product of products) {
    const part = section(`${product} prompts`, 3)
    const prompts = part.split('\n').filter(l => l.startsWith('- '))
    expect(prompts.length).toBeGreaterThanOrEqual(3)
    expect(body).toContain(`### ${product} prompts`)
  }
})

test('the copyright holder is recorded as decided', () => {
  expect(text).toContain('Drupad Sachania')
  expect(text).not.toMatch(/undecided|still open/i)
})
