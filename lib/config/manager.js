'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_FILE = path.join(os.homedir(), '.aegisrc')

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { tools: {}, lastUpdated: null }
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  } catch (err) {
    console.error(`Error reading config: ${err.message}`)
    return { tools: {}, lastUpdated: null }
  }
}

function saveConfig(config) {
  const data = { ...config, lastUpdated: new Date().toISOString() }
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error(`Error saving config: ${err.message}`)
    return false
  }
}

function getTool(toolName) {
  return loadConfig().tools[toolName] || null
}

function setTool(toolName, toolConfig) {
  const config = loadConfig()
  config.tools = config.tools || {}
  config.tools[toolName] = { ...toolConfig, configuredAt: new Date().toISOString() }
  return saveConfig(config)
}

function listTools() {
  return Object.keys(loadConfig().tools || {})
}

function getConfigPath() {
  return CONFIG_FILE
}

module.exports = { loadConfig, saveConfig, getTool, setTool, listTools, getConfigPath }
