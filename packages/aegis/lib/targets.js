'use strict'

/**
 * Installer targets: one row per platform. Every path below was checked
 * against the vendor documentation listed in `docs` on VERIFIED_ON.
 * Platform paths change often: re-verify every row before each release.
 */

const path = require('path')

const VERIFIED_ON = '2026-10-07'
const j = path.join
const stdio = e => ({ type: 'stdio', ...e })
const plain = e => ({ ...e })
const json = (file, key, entry) => ({ file, format: 'json', key, entry })
const toml = file => ({ file, format: 'toml', key: 'mcp_servers', entry: plain })

const TARGETS = {
  claude: {
    label: 'Claude Code',
    verifiedOn: VERIFIED_ON,
    docs: ['https://code.claude.com/docs/en/skills', 'https://code.claude.com/docs/en/mcp'],
    detect: home => [j(home, '.claude')],
    skills: { user: h => j(h, '.claude', 'skills'), project: d => j(d, '.claude', 'skills') },
    mcp: { user: json(h => j(h, '.claude.json'), 'mcpServers', stdio), project: json(d => j(d, '.mcp.json'), 'mcpServers', stdio) }
  },
  codex: {
    label: 'OpenAI Codex',
    verifiedOn: VERIFIED_ON,
    docs: ['https://learn.chatgpt.com/docs/build-skills', 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli'],
    detect: home => [j(home, '.codex')],
    skills: { user: h => j(h, '.agents', 'skills'), project: d => j(d, '.agents', 'skills') },
    mcp: { user: toml(h => j(h, '.codex', 'config.toml')), project: toml(d => j(d, '.codex', 'config.toml')) }
  },
  gemini: {
    label: 'Gemini CLI',
    verifiedOn: VERIFIED_ON,
    docs: ['https://geminicli.com/docs/cli/skills/', 'https://geminicli.com/docs/tools/mcp-server/'],
    detect: home => [j(home, '.gemini', 'settings.json')],
    skills: { user: h => j(h, '.gemini', 'skills'), project: d => j(d, '.gemini', 'skills') },
    mcp: { user: json(h => j(h, '.gemini', 'settings.json'), 'mcpServers', plain), project: json(d => j(d, '.gemini', 'settings.json'), 'mcpServers', plain) }
  },
  cursor: {
    label: 'Cursor',
    verifiedOn: VERIFIED_ON,
    docs: ['https://cursor.com/docs/context/skills', 'https://cursor.com/docs/context/mcp'],
    detect: home => [j(home, '.cursor')],
    skills: { user: h => j(h, '.cursor', 'skills'), project: d => j(d, '.cursor', 'skills') },
    mcp: { user: json(h => j(h, '.cursor', 'mcp.json'), 'mcpServers', stdio), project: json(d => j(d, '.cursor', 'mcp.json'), 'mcpServers', stdio) }
  },
  vscode: {
    label: 'VS Code (GitHub Copilot)',
    verifiedOn: VERIFIED_ON,
    docs: ['https://code.visualstudio.com/docs/copilot/customization/agent-skills', 'https://code.visualstudio.com/docs/copilot/customization/mcp-servers'],
    detect: home => [j(home, '.copilot'), j(home, '.vscode')],
    skills: { user: h => j(h, '.copilot', 'skills'), project: d => j(d, '.github', 'skills') },
    mcp: {
      // The user-level mcp.json path is not documented: print the official CLI command instead.
      user: { file: null, format: 'manual', key: null, entry: stdio, manual: e => `code --add-mcp '${JSON.stringify({ name: 'aegis', ...e })}'` },
      project: json(d => j(d, '.vscode', 'mcp.json'), 'servers', stdio)
    }
  },
  antigravity: {
    label: 'Google Antigravity',
    verifiedOn: VERIFIED_ON,
    docs: ['https://antigravity.google/docs/skills', 'https://antigravity.google/docs/mcp'],
    detect: home => [j(home, '.gemini', 'config'), j(home, '.gemini', 'antigravity')],
    skills: { user: h => j(h, '.gemini', 'config', 'skills'), project: d => j(d, '.agents', 'skills') },
    mcp: { user: json(h => j(h, '.gemini', 'config', 'mcp_config.json'), 'mcpServers', plain), project: json(d => j(d, '.agents', 'mcp_config.json'), 'mcpServers', plain) }
  }
}

const PLATFORM_IDS = ['claude', 'codex', 'gemini', 'cursor', 'vscode', 'antigravity']
const SERVER_NAME = 'aegis'

// How a platform starts the Aegis MCP server. "local" pins this installed copy
// (used for tarball tests); "npx" survives upgrades and cache cleans.
function mcpEntry (mode = 'npx', platform = process.platform) {
  if (mode === 'local') return { command: process.execPath, args: [path.join(__dirname, '..', 'cli', 'aegis.js'), 'mcp'] }
  const args = ['-y', 'aegis-skills@1', 'mcp']
  return platform === 'win32' ? { command: 'cmd', args: ['/c', 'npx', ...args] } : { command: 'npx', args }
}

module.exports = { TARGETS, PLATFORM_IDS, SERVER_NAME, VERIFIED_ON, mcpEntry }
