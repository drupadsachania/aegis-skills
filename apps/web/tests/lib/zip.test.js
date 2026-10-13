'use strict'

const zlib = require('zlib')
const crypto = require('crypto')
const { createZip } = require('../../lib/zip')
const { readZip } = require('../helpers/read-zip')

describe('createZip', () => {
  test('round-trips text and buffer entries with correct CRC and sizes', () => {
    const md = '# Title\n\n' + 'repeatable line\n'.repeat(200)
    const bin = Buffer.from([0, 1, 2, 3, 250, 251])
    const zip = createZip([{ name: 'skill/SKILL.md', data: md }, { name: 'skill/bin.dat', data: bin }])
    const out = readZip(zip)
    expect(out.map(e => e.name)).toEqual(['skill/SKILL.md', 'skill/bin.dat'])
    expect(out[0].data.toString('utf8')).toBe(md)
    expect(out[1].data.equals(bin)).toBe(true)
    expect(out[0].crc).toBe(zlib.crc32(Buffer.from(md)))
    expect(out[0].usize).toBe(Buffer.byteLength(md))
  })

  test('deflates compressible data and stores incompressible data', () => {
    const out = readZip(createZip([
      { name: 'a.txt', data: 'aaaa'.repeat(500) },
      { name: 'r.bin', data: crypto.randomBytes(64) }
    ]))
    expect(out[0].method).toBe(8)
    expect(out[1].method).toBe(0)
  })

  test('sets the UTF-8 name flag and is byte-for-byte deterministic', () => {
    const input = [{ name: 'x/é.md', data: 'hi' }]
    const a = createZip(input)
    const b = createZip(input)
    expect(a.equals(b)).toBe(true)
    expect(readZip(a)[0].flags & 0x0800).toBe(0x0800)
    expect(readZip(a)[0].name).toBe('x/é.md')
  })

  test('an empty archive is a bare 22-byte end record', () => {
    const zip = createZip([])
    expect(zip.length).toBe(22)
    expect(readZip(zip)).toEqual([])
  })

  test.each(['', '/abs.md', '../up.md', 'a/../b.md', 'a\\b.md', 'a//b.md', 'dir/', './a.md', 'nul\0.md'])(
    'rejects unsafe entry name %j', name => {
      expect(() => createZip([{ name, data: 'x' }])).toThrow(/zip:/)
    })

  test('rejects duplicate names', () => {
    expect(() => createZip([{ name: 'a.md', data: '1' }, { name: 'a.md', data: '2' }])).toThrow(/duplicate/)
  })
})
