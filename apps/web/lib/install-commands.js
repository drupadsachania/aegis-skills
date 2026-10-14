'use strict'

// Single source of truth for every install command shown on the site.
// Pinned against repo facts by tests/lib/install-commands.test.js.
const { SITE_URL } = require('./site-url')
const REPO = 'drupadsachania/aegis-skills'
const REPO_URL = `https://github.com/${REPO}`
const MCP_URL = `${SITE_URL}/api/mcp`
const MARKETPLACE = 'aegis-skills' // PHASE-1 BINDING
const PACKAGES = { aegis: 'aegis-skills', themisPlugin: '@aegis-skills/themis-plugin', themisApp: '@aegis-skills/themis' }
const AEGIS_PLATFORM_IDS = ['claude', 'codex', 'gemini', 'cursor', 'vscode', 'antigravity'] // PHASE-1 BINDING
// Nothing is published yet (Phase 7 publishes). Aegis installs that need the npm package, the GitHub
// marketplace or a GitHub release are flagged `availability: LATER` (they open with the first release).
// Owner decision 2026-10-12: Aegis publishes first; Themis is still being matured locally and is deferred
// on npm and the directories, so every Themis install is flagged `availability: IN_DEV` instead.
const LATER = 'after-first-release'
// THE ONE-LINE FLIP: set this to true when aegis-skills is on npm, the GitHub Release exists and the marketplace works
// (docs/RELEASE-RUNBOOK.md section 4). It removes the "after the first release" marker from every Aegis install row.
// tests/lib/install-commands.test.js proves the flip by evaluating this file with the line changed.
const AEGIS_PUBLISHED = true
const AEGIS_AVAILABILITY = AEGIS_PUBLISHED ? {} : { availability: LATER }
const IN_DEV = 'in-development'
const GEMINI_EXTENSION_INSTALL = `gemini extensions install ${REPO_URL}` // PHASE-1 BINDING (null if not offered)

const aegisInstall = id => `npx ${PACKAGES.aegis} install --platform ${id}`
const marketplaceAdd = `/plugin marketplace add ${REPO}`
const sh = code => ({ label: 'shell', code })
const json = obj => JSON.stringify(obj, null, 2)
const stdio = (pkgArgs) => ({ command: 'npx', args: ['-y', ...pkgArgs] })

const PATHS = [
  {
    id: 'zero-install', product: 'aegis', title: 'Zero install', audience: 'Anyone, in any chat AI',
    how: 'Copy a single-file prompt or download a skill zip.', docs: '/docs/aegis/single-file-prompts',
    platforms: [
      { id: 'claude-ai', label: 'Claude.ai', steps: [
        { text: 'Open a skill page and download its zip.' },
        { text: 'In Claude.ai open Settings → Capabilities → Skills → Upload skill, and choose the zip.' }] },
      { id: 'chatgpt', label: 'ChatGPT', steps: [
        { text: 'Open a skill page and download the single-file prompt (.md).' },
        { text: 'Add the file to a Project or attach it to a chat, and ask ChatGPT to follow it.' }] },
      { id: 'any', label: 'Any chat AI', steps: [
        { text: 'Copy the single-file prompt from a skill page. Paste it as your first message, or save it as the system prompt or custom instructions where your tool allows.' }] }
    ]
  },
  {
    id: 'hosted-mcp', product: 'aegis', title: 'Hosted MCP', audience: 'Claude.ai, ChatGPT and any MCP client',
    how: 'Connect to the hosted, read-only Aegis MCP server.', docs: '/docs/aegis/hosted-mcp',
    platforms: [
      { id: 'claude-ai', label: 'Claude.ai', steps: [
        { text: 'Settings → Connectors → Add custom connector. Name it Aegis and paste this URL:' },
        { label: 'URL', code: MCP_URL }] },
      { id: 'chatgpt', label: 'ChatGPT', steps: [
        { text: 'Settings → Apps & Connectors → Advanced settings → turn on Developer mode. Create a connector, paste this URL and choose "No authentication".' },
        { label: 'URL', code: MCP_URL }] },
      { id: 'claude-code', label: 'Claude Code', steps: [sh(`claude mcp add --transport http aegis ${MCP_URL}`)] },
      { id: 'cursor', label: 'Cursor', steps: [
        { text: 'Add to ~/.cursor/mcp.json:' },
        { label: 'mcp.json', code: json({ mcpServers: { aegis: { url: MCP_URL } } }) }] },
      { id: 'vscode', label: 'VS Code', steps: [
        { text: 'Add to .vscode/mcp.json:' },
        { label: 'mcp.json', code: json({ servers: { aegis: { type: 'http', url: MCP_URL } } }) }] },
      { id: 'generic', label: 'Other clients', steps: [
        { text: 'Any client that speaks MCP Streamable HTTP. No authentication, no session.' },
        { label: 'URL', code: MCP_URL }] }
    ]
  },
  {
    id: 'skill-pack', product: 'aegis', title: 'Skill pack', audience: 'Coding assistants',
    how: "Install every skill into your assistant's native skills folder.", docs: '/docs/aegis/getting-started',
    platforms: [
      { id: 'claude', label: 'Claude Code', ...AEGIS_AVAILABILITY, steps: [
        { text: 'Inside Claude Code:' },
        { label: 'Claude Code', code: `${marketplaceAdd}\n/plugin install aegis-skills@${MARKETPLACE}` },
        { text: 'Or from a terminal:' }, sh(aegisInstall('claude'))] },
      { id: 'codex', label: 'Codex', ...AEGIS_AVAILABILITY, steps: [sh(aegisInstall('codex'))] },
      { id: 'gemini', label: 'Gemini CLI', ...AEGIS_AVAILABILITY, steps: [
        ...(GEMINI_EXTENSION_INSTALL ? [sh(GEMINI_EXTENSION_INSTALL), { text: 'Or:' }] : []),
        sh(aegisInstall('gemini'))] },
      { id: 'cursor', label: 'Cursor', ...AEGIS_AVAILABILITY, steps: [sh(aegisInstall('cursor'))] },
      { id: 'vscode', label: 'VS Code Copilot', ...AEGIS_AVAILABILITY, steps: [sh(aegisInstall('vscode'))] },
      { id: 'antigravity', label: 'Antigravity', ...AEGIS_AVAILABILITY, steps: [sh(aegisInstall('antigravity'))] }
    ]
  },
  {
    id: 'themis-plugin', product: 'themis', title: 'Themis on your AI', status: IN_DEV, audience: 'Claude Code, Codex, Gemini CLI',
    how: 'Install the Themis plugin. Your assistant is the model, so no API key is needed.', docs: '/docs/themis/mode-1-plugin',
    platforms: [
      { id: 'claude', label: 'Claude Code', availability: IN_DEV, steps: [
        { text: 'Not in the Claude Code marketplace yet: the marketplace lists Aegis only, until the Themis plugin is published to npm. Run it from the repository today.' }] },
      { id: 'codex', label: 'Codex', availability: IN_DEV, steps: [ // PHASE-3 BINDING
        { text: 'Add to ~/.codex/config.toml:' },
        { label: 'config.toml', code: '[mcp_servers.aegis]\ncommand = "npx"\nargs = ["-y", "aegis-skills", "mcp"]\n\n[mcp_servers.themis]\ncommand = "npx"\nargs = ["-y", "@aegis-skills/themis-plugin"]' }] },
      { id: 'gemini', label: 'Gemini CLI', availability: IN_DEV, steps: [ // PHASE-3 BINDING
        { text: 'Add to ~/.gemini/settings.json:' },
        { label: 'settings.json', code: json({ mcpServers: { aegis: stdio([PACKAGES.aegis, 'mcp']), themis: stdio([PACKAGES.themisPlugin]) } }) }] }
    ]
  },
  {
    id: 'themis-app', product: 'themis', title: 'Themis standalone', status: IN_DEV, audience: 'A local SOC dashboard',
    how: 'Run Themis with its own web UI on 127.0.0.1, using your own key or a local model.', docs: '/docs/themis/mode-2-app',
    platforms: [
      { id: 'npx', label: 'Run with npx', availability: IN_DEV, steps: [
        { text: 'Needs Node.js 24 or later. No Docker, no build tools.' },
        sh(`npx ${PACKAGES.themisApp} dashboard`)] },
      { id: 'global', label: 'Global install', availability: IN_DEV, steps: [sh(`npm install -g ${PACKAGES.themisApp}\nthemis dashboard`)] }
    ]
  }
]

module.exports = { AEGIS_PUBLISHED, LATER, IN_DEV, SITE_URL, REPO, REPO_URL, MCP_URL, MARKETPLACE, PACKAGES, AEGIS_PLATFORM_IDS, GEMINI_EXTENSION_INSTALL, PATHS }