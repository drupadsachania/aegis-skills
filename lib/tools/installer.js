'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')

const SKILLS_DIR = path.join(__dirname, '..', '..', 'skills')

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function copyDir(src, dest) {
  ensureDir(dest)
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function installForClaude(toolInfo, isGlobal) {
  const destDir = path.join(toolInfo.path, 'skills')
  ensureDir(destDir)
  if (fs.existsSync(SKILLS_DIR)) {
    copyDir(SKILLS_DIR, destDir)
  }
  // Write MCP manifest pointer
  const manifestDest = path.join(toolInfo.path, 'aegis-skills-manifest.json')
  fs.writeFileSync(manifestDest, JSON.stringify({
    name: 'aegis-skills',
    version: require('../../package.json').version,
    skillsDir: destDir,
    installedAt: new Date().toISOString()
  }, null, 2))
  return destDir
}

function installForCursor(toolInfo, isGlobal) {
  const destDir = path.join(toolInfo.path, 'aegis-skills')
  ensureDir(destDir)
  if (fs.existsSync(SKILLS_DIR)) {
    copyDir(SKILLS_DIR, destDir)
  }
  return destDir
}

function installForVSCode(toolInfo, isGlobal) {
  const destDir = path.join(os.homedir(), '.vscode', 'aegis-skills')
  ensureDir(destDir)
  if (fs.existsSync(SKILLS_DIR)) {
    copyDir(SKILLS_DIR, destDir)
  }
  return destDir
}

function installGeneric(toolInfo, toolName, isGlobal) {
  const destDir = path.join(toolInfo.configDir, 'aegis-skills')
  ensureDir(destDir)
  if (fs.existsSync(SKILLS_DIR)) {
    copyDir(SKILLS_DIR, destDir)
  }
  return destDir
}

async function installForTool(toolName, toolInfo, isGlobal) {
  switch (toolName) {
    case 'claude':    return installForClaude(toolInfo, isGlobal)
    case 'cursor':    return installForCursor(toolInfo, isGlobal)
    case 'vscode':    return installForVSCode(toolInfo, isGlobal)
    default:          return installGeneric(toolInfo, toolName, isGlobal)
  }
}

module.exports = { installForTool }
