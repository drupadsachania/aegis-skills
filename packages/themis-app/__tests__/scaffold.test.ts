import fs from 'node:fs'
import path from 'node:path'

const root = path.join(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

describe('themis-app scaffold', () => {
  it('declares the themis bin and Node engine', () => {
    expect(pkg.name).toBe('@aegis-skills/themis')
    expect(pkg.bin).toEqual({ themis: 'bin/themis.js' })
    expect(pkg.engines.node).toBe('>=24')
    expect(pkg.license).toBe('(Apache-2.0 OR MIT)')
  })
  it('has no native, web-framework or hosted-db runtime dependencies', () => {
    const banned = ['better-sqlite3', '@supabase/supabase-js', 'express', 'next', 'react', 'react-dom', 'vite']
    for (const name of banned) expect(Object.keys(pkg.dependencies)).not.toContain(name)
  })
  it('bin filters only the SQLite experimental warning', () => {
    const bin = fs.readFileSync(path.join(root, 'bin', 'themis.js'), 'utf8')
    expect(bin.startsWith('#!/usr/bin/env node')).toBe(true)
    expect(bin).toMatch(/SQLite/)
  })
})
