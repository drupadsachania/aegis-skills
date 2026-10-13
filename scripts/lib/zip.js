'use strict'

// Tiny, dependency-free ZIP writer (PKWARE APPNOTE 6.3, no ZIP64).
// Deflate via node:zlib; stores an entry when deflate does not shrink it.
// Timestamps are fixed to 1980-01-01 00:00 so output is reproducible.
const zlib = require('zlib')

const DOS_TIME = 0
const DOS_DATE = (0 << 9) | (1 << 5) | 1 // 1980-01-01
const FLAG_UTF8 = 0x0800
const MAX_U16 = 0xffff
const MAX_U32 = 0xffffffff

function assertSafeName (name, seen) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
    throw new Error('zip: invalid entry name')
  }
  const bad = name.startsWith('/') || name.includes('\\') || name.includes('\0') ||
    name.split('/').some(seg => seg === '' || seg === '.' || seg === '..')
  if (bad) throw new Error(`zip: unsafe entry name: ${JSON.stringify(name)}`)
  if (seen.has(name)) throw new Error(`zip: duplicate entry: ${name}`)
  seen.add(name)
}

/**
 * @param {{ name: string, data: Buffer|string }[]} entries  POSIX paths, files only
 * @returns {Buffer}
 */
function createZip (entries) {
  if (entries.length > MAX_U16) throw new Error('zip: too many entries')
  const seen = new Set()
  const parts = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    assertSafeName(entry.name, seen)
    const name = Buffer.from(entry.name, 'utf8')
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8')
    const crc = zlib.crc32(raw) >>> 0
    const deflated = zlib.deflateRawSync(raw, { level: 9 })
    const method = deflated.length < raw.length ? 8 : 0
    const body = method === 8 ? deflated : raw
    if (raw.length > MAX_U32 || offset > MAX_U32) throw new Error('zip: archive too large')

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(FLAG_UTF8, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    parts.push(local, name, body)

    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0)
    cen.writeUInt16LE(20, 4)
    cen.writeUInt16LE(20, 6)
    cen.writeUInt16LE(FLAG_UTF8, 8)
    cen.writeUInt16LE(method, 10)
    cen.writeUInt16LE(DOS_TIME, 12)
    cen.writeUInt16LE(DOS_DATE, 14)
    cen.writeUInt32LE(crc, 16)
    cen.writeUInt32LE(body.length, 20)
    cen.writeUInt32LE(raw.length, 24)
    cen.writeUInt16LE(name.length, 28)
    // extra len (30), comment len (32), disk (34), int attrs (36), ext attrs (38) = 0
    cen.writeUInt32LE(offset, 42)
    central.push(cen, name)

    offset += local.length + name.length + body.length
  }

  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, cd, end])
}

module.exports = { createZip }
