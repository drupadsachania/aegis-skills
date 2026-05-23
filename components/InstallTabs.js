'use strict'

const React = require('react')
const { useState } = React
const CopyButton = require('./CopyButton')

const TABS = ['System Prompt', 'ChatGPT Action', 'MCP']

function TabButton({ label, active, onClick }) {
  return React.createElement(
    'button',
    {
      onClick,
      className: [
        'px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors',
        active
          ? 'border-indigo-400 text-indigo-400'
          : 'border-transparent text-zinc-400 hover:text-zinc-200'
      ].join(' ')
    },
    label
  )
}

function CodeBlock({ children }) {
  return React.createElement(
    'pre',
    {
      className: 'bg-zinc-900 border border-zinc-800 rounded p-4 text-sm text-zinc-100 font-mono overflow-x-auto whitespace-pre-wrap break-all'
    },
    children
  )
}

function SystemPromptPanel({ systemPrompt }) {
  return React.createElement(
    'div',
    { className: 'space-y-3' },
    React.createElement(
      'p',
      { className: 'text-zinc-400 text-sm' },
      'Paste into Claude Projects, Gemini Gems, or any chat UI system prompt field.'
    ),
    React.createElement(CodeBlock, null, systemPrompt),
    React.createElement(CopyButton, { text: systemPrompt, label: 'Copy system prompt' })
  )
}

function ChatGPTPanel({ openaiAction }) {
  return React.createElement(
    'div',
    { className: 'space-y-3' },
    React.createElement(
      'p',
      { className: 'text-zinc-400 text-sm' },
      'In ChatGPT → Explore GPTs → Create → Configure → Add Action → import schema.'
    ),
    React.createElement(CodeBlock, null, openaiAction),
    React.createElement(CopyButton, { text: openaiAction, label: 'Copy Action JSON' })
  )
}

function McpPanel({ mcpUrl, mcpConfig }) {
  return React.createElement(
    'div',
    { className: 'space-y-4' },
    React.createElement(
      'div',
      { className: 'space-y-2' },
      React.createElement('p', { className: 'text-zinc-400 text-sm' }, 'Endpoint URL:'),
      React.createElement(CodeBlock, null, mcpUrl),
      React.createElement(CopyButton, { text: mcpUrl, label: 'Copy URL' })
    ),
    React.createElement(
      'div',
      { className: 'space-y-2' },
      React.createElement('p', { className: 'text-zinc-400 text-sm' }, 'claude_desktop_config.json snippet:'),
      React.createElement(CodeBlock, null, mcpConfig),
      React.createElement(CopyButton, { text: mcpConfig, label: 'Copy config snippet' })
    )
  )
}

function TableView({ systemPrompt, openaiAction, mcpConfig }) {
  const rows = [
    { platform: 'Any chat UI', artifact: 'System prompt', where: 'Claude Projects / Gemini Gems / Mistral', text: systemPrompt, copyLabel: 'Copy' },
    { platform: 'ChatGPT', artifact: 'Action JSON', where: 'GPT Builder → Add Action', text: openaiAction, copyLabel: 'Copy' },
    { platform: 'Claude Desktop / Cursor', artifact: 'MCP endpoint', where: 'claude_desktop_config.json', text: mcpConfig, copyLabel: 'Copy' }
  ]

  return React.createElement(
    'div',
    { className: 'overflow-x-auto' },
    React.createElement(
      'table',
      { className: 'w-full text-sm' },
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          { className: 'border-b border-zinc-800 text-zinc-400 text-left' },
          React.createElement('th', { className: 'pb-2 pr-6 font-medium' }, 'Platform'),
          React.createElement('th', { className: 'pb-2 pr-6 font-medium' }, 'Artifact'),
          React.createElement('th', { className: 'pb-2 pr-6 font-medium' }, 'Where to paste'),
          React.createElement('th', { className: 'pb-2 font-medium' }, '')
        )
      ),
      React.createElement(
        'tbody',
        null,
        ...rows.map((row, i) =>
          React.createElement(
            'tr',
            { key: i, className: 'border-b border-zinc-800/50' },
            React.createElement('td', { className: 'py-3 pr-6 text-zinc-300' }, row.platform),
            React.createElement('td', { className: 'py-3 pr-6 text-zinc-300' }, row.artifact),
            React.createElement('td', { className: 'py-3 pr-6 text-zinc-400' }, row.where),
            React.createElement('td', { className: 'py-3' }, React.createElement(CopyButton, { text: row.text, label: row.copyLabel }))
          )
        )
      )
    )
  )
}

function ListView({ systemPrompt, openaiAction, mcpConfig }) {
  const cards = [
    { platform: 'Any chat UI', artifact: 'System prompt', where: 'Claude Projects / Gemini Gems / Mistral', text: systemPrompt, copyLabel: 'Copy system prompt' },
    { platform: 'ChatGPT', artifact: 'Action JSON', where: 'GPT Builder → Add Action', text: openaiAction, copyLabel: 'Copy Action JSON' },
    { platform: 'Claude Desktop / Cursor', artifact: 'MCP config', where: 'claude_desktop_config.json', text: mcpConfig, copyLabel: 'Copy config' }
  ]

  return React.createElement(
    'div',
    { className: 'space-y-3' },
    ...cards.map((card, i) =>
      React.createElement(
        'div',
        { key: i, className: 'p-4 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-between gap-4' },
        React.createElement(
          'div',
          null,
          React.createElement('p', { className: 'text-zinc-100 font-medium text-sm' }, card.platform),
          React.createElement('p', { className: 'text-zinc-400 text-xs mt-0.5' }, `${card.artifact} → ${card.where}`)
        ),
        React.createElement(CopyButton, { text: card.text, label: card.copyLabel })
      )
    )
  )
}

function InstallTabs({ name, systemPrompt, openaiAction, mcpUrl, mcpConfig }) {
  const [activeTab, setActiveTab] = useState('System Prompt')
  const [viewMode, setViewMode] = useState('table')

  const tabContent = {
    'System Prompt': React.createElement(SystemPromptPanel, { systemPrompt }),
    'ChatGPT Action': React.createElement(ChatGPTPanel, { openaiAction }),
    'MCP': React.createElement(McpPanel, { mcpUrl, mcpConfig })
  }

  return React.createElement(
    'div',
    { className: 'space-y-4' },
    // Tab bar + view toggle
    React.createElement(
      'div',
      { className: 'flex items-center justify-between border-b border-zinc-800' },
      React.createElement(
        'div',
        { className: 'flex gap-1' },
        ...TABS.map(tab =>
          React.createElement(TabButton, {
            key: tab,
            label: tab,
            active: activeTab === tab,
            onClick: () => setActiveTab(tab)
          })
        )
      ),
      React.createElement(
        'div',
        { className: 'flex gap-1 pb-2' },
        React.createElement(
          'button',
          {
            onClick: () => setViewMode('table'),
            className: [
              'px-3 py-1 text-xs rounded transition-colors',
              viewMode === 'table' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            ].join(' ')
          },
          'Table'
        ),
        React.createElement(
          'button',
          {
            onClick: () => setViewMode('list'),
            className: [
              'px-3 py-1 text-xs rounded transition-colors',
              viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            ].join(' ')
          },
          'List'
        )
      )
    ),
    // Per-tab content
    React.createElement('div', null, tabContent[activeTab]),
    // All-platforms view (always visible)
    React.createElement(
      'div',
      { className: 'mt-6' },
      React.createElement(
        'p',
        { className: 'text-zinc-500 text-xs uppercase tracking-wider mb-3' },
        'All platforms'
      ),
      viewMode === 'table'
        ? React.createElement(TableView, { name, systemPrompt, openaiAction, mcpConfig })
        : React.createElement(ListView, { name, systemPrompt, openaiAction, mcpConfig })
    )
  )
}

module.exports = InstallTabs
module.exports.default = InstallTabs
