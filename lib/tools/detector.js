'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const HOME = os.homedir()
const PLATFORM = process.platform

function tryExec(cmd) {
  try { execSync(cmd, { stdio: 'pipe' }); return true } catch { return false }
}

function detectClaude() {
  const paths = [
    path.join(HOME, '.claude'),
    path.join(HOME, 'AppData', 'Roaming', 'Claude'),
    path.join(HOME, 'Library', 'Application Support', 'Claude')
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) return { installed: true, path: p, configDir: p }
  }
  return null
}

function detectChatGPT() {
  const paths = [
    path.join(HOME, '.chatgpt'),
    path.join(HOME, 'AppData', 'Local', 'ChatGPT')
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) return { installed: true, path: p, configDir: p }
  }
  if (tryExec('chatgpt --version')) {
    return { installed: true, path: 'cli', configDir: path.join(HOME, '.config', 'chatgpt') }
  }
  return null
}

function detectCursor() {
  const p = path.join(HOME, '.cursor')
  if (fs.existsSync(p)) return { installed: true, path: p, configDir: p }
  return null
}

function detectGemini() {
  if (tryExec('gemini --version')) {
    return { installed: true, path: 'cli', configDir: path.join(HOME, '.config', 'gemini-cli') }
  }
  return null
}

function detectVSCode() {
  const vscodePaths = {
    win32: path.join(HOME, 'AppData', 'Roaming', 'Code', 'User', 'extensions'),
    darwin: path.join(HOME, 'Library', 'Application Support', 'Code', 'User', 'extensions'),
    linux: path.join(HOME, '.vscode', 'extensions')
  }
  const p = vscodePaths[PLATFORM]
  if (p && fs.existsSync(p)) return { installed: true, path: p, configDir: p }
  return null
}

function detectAntigravity() {
  if (tryExec('antigravity --version')) {
    return { installed: true, path: 'cli', configDir: path.join(HOME, '.config', 'antigravity') }
  }
  return null
}

function detectTool(toolName) {
  const detectors = {
    claude: detectClaude,
    chatgpt: detectChatGPT,
    cursor: detectCursor,
    gemini: detectGemini,
    vscode: detectVSCode,
    'antigravity-cli': detectAntigravity
  }
  const fn = detectors[toolName]
  return fn ? fn() : null
}

function detectAllTools() {
  const tools = ['claude', 'chatgpt', 'cursor', 'gemini', 'vscode', 'antigravity-cli']
  const detected = {}
  for (const tool of tools) {
    const result = detectTool(tool)
    if (result) detected[tool] = result
  }
  return detected
}

module.exports = { detectTool, detectAllTools }
