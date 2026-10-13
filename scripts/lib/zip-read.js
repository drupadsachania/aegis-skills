'use strict'
// Minimal ZIP reader used only to validate what scripts/lib/zip.js wrote (and any other release ZIP).
// Reads the central directory, inflates stored/deflated entries and verifies every CRC-32. No ZIP64, no encryption.
const zlib = require('zlib')

function readZip (buf) {
  if (!Buffer.isBuffer(buf)) throw new Error('zip: input is not a Buffer')
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd === -1) throw new Error('zip: end of central directory not found')
  const count = buf.readUInt16LE(eocd + 10)
  const cdSize = buf.readUInt32LE(eocd + 12)
  let p = buf.readUInt32LE(eocd + 16)
  if (p + cdSize > eocd) throw new Error('zip: central directory is out of range')
  const entries = []
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`zip: bad central header #${n}`)
    const flags = buf.readUInt16LE(p + 8)
    const method = buf.readUInt16LE(p + 10)
    const crc = buf.readUInt32LE(p + 16)
    const csize = buf.readUInt32LE(p + 20)
    const usize = buf.readUInt32LE(p + 24)
    const nlen = buf.readUInt16LE(p + 28)
    const xlen = buf.readUInt16LE(p + 30)
    const clen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nlen)
    if (flags & 1) throw new Error(`zip: ${name} is encrypted`)
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`zip: bad local header for ${name}`)
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const body = buf.subarray(start, start + csize)
    let data
    if (method === 0) data = Buffer.from(body)
    else if (method === 8) data = zlib.inflateRawSync(body)
    else throw new Error(`zip: ${name} uses unsupported method ${method}`)
    if (data.length !== usize) throw new Error(`zip: ${name} size mismatch (${data.length} != ${usize})`)
    if ((zlib.crc32(data) >>> 0) !== crc) throw new Error(`zip: ${name} CRC mismatch`)
    entries.push({ name, data, compressedSize: csize })
    p += 46 + nlen + xlen + clen
  }
  return entries
}

module.exports = { readZip }
