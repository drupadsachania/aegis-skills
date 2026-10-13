'use strict'

function stripFrontmatter (md) {
  return String(md).replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

// Body of "## <heading>" up to the next h1/h2, trimmed; null when absent or empty.
function extractSection (md, heading) {
  const lines = String(md).split(/\r?\n/)
  const want = `## ${heading}`.toLowerCase()
  const start = lines.findIndex(l => l.trim().toLowerCase() === want)
  if (start === -1) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) { end = i; break }
  }
  const text = lines.slice(start + 1, end).join('\n').trim()
  return text || null
}

module.exports = { stripFrontmatter, extractSection }
