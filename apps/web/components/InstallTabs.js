'use strict'

const React = require('react')
const { useState } = React
const CopyButton = require('./CopyButton')

const TABS = ['System Prompt', 'MCP']

function CodeBlock ({ label, content }) {
  return React.createElement(
    'div',
    { className: 'code-block' },
    React.createElement(
      'div',
      { className: 'code-hd' },
      React.createElement('span', { className: 'code-hd-label' }, label),
      React.createElement(CopyButton, { text: content, label: 'COPY' })
    ),
    React.createElement('pre', { className: 'code-body' }, content)
  )
}

function SystemPromptPanel ({ systemPrompt }) {
  return React.createElement(
    'div',
    null,
    React.createElement('p', { className: 'install-note' }, 'Paste into ChatGPT, Claude Projects, Gemini Gems or any chat UI system prompt field.'),
    React.createElement(CodeBlock, { label: 'single-file prompt', content: systemPrompt })
  )
}

function McpPanel ({ mcpUrl, mcpConfig }) {
  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '0' } },
    React.createElement('p', { className: 'install-note' }, 'Connect Claude, ChatGPT, Cursor or any MCP client to the hosted read-only Aegis MCP server, or run it locally with npx aegis-skills mcp.'),
    React.createElement(CodeBlock, { label: 'endpoint URL', content: mcpUrl }),
    React.createElement(CodeBlock, { label: 'MCP config', content: mcpConfig })
  )
}

function AllPlatformsTable ({ systemPrompt, mcpConfig }) {
  const rows = [
    { platform: 'Any chat UI', artifact: 'System prompt', where: 'ChatGPT / Claude Projects / Gemini Gems', text: systemPrompt },
    { platform: 'MCP clients', artifact: 'MCP config', where: 'Claude, ChatGPT, Cursor, VS Code', text: mcpConfig }
  ]

  return React.createElement(
    'div',
    null,
    React.createElement('span', { className: 'install-label' }, 'All platforms'),
    React.createElement(
      'div',
      { style: { border: '1px solid var(--border-dim)' } },
      React.createElement(
        'table',
        { className: 'platforms-table' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Platform'),
            React.createElement('th', null, 'Artifact'),
            React.createElement('th', null, 'Where to paste'),
            React.createElement('th', null, '')
          )
        ),
        React.createElement(
          'tbody',
          null,
          ...rows.map((row, i) =>
            React.createElement(
              'tr',
              { key: i },
              React.createElement('td', { style: { color: 'var(--cream)', fontFamily: 'var(--f-mono)', fontSize: '12px' } }, row.platform),
              React.createElement('td', null, row.artifact),
              React.createElement('td', { style: { color: 'var(--muted)', fontSize: '12px' } }, row.where),
              React.createElement('td', null, React.createElement(CopyButton, { text: row.text, label: 'COPY' }))
            )
          )
        )
      )
    )
  )
}

function InstallTabs ({ name, systemPrompt, mcpUrl, mcpConfig }) {
  const [activeTab, setActiveTab] = useState('System Prompt')
  const tabContent = {
    'System Prompt': React.createElement(SystemPromptPanel, { systemPrompt }),
    MCP: React.createElement(McpPanel, { mcpUrl, mcpConfig })
  }

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '24px' } },
    React.createElement(
      'div',
      { className: 'install-tabs' },
      React.createElement(
        'div',
        { className: 'install-tab-bar' },
        ...TABS.map(tab =>
          React.createElement(
            'button',
            {
              key: tab,
              onClick: () => setActiveTab(tab),
              className: ['install-tab-btn', activeTab === tab ? 'active' : ''].join(' ').trim()
            },
            tab
          )
        )
      ),
      React.createElement('div', { className: 'install-tab-content' }, tabContent[activeTab])
    ),
    React.createElement(AllPlatformsTable, { name, systemPrompt, mcpConfig })
  )
}

module.exports = InstallTabs
module.exports.default = InstallTabs
