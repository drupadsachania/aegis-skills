import * as core from '../src'

it('exports every contracts §6 runtime name', () => {
  for (const name of ['THEMIS_WORKFLOW', 'startRun', 'advance', 'openStore', 'themisHome', 'classifyTool', 'dispositionFor',
    'serverPermitsApproval', 'loadMcpServers', 'serversForSkill', 'redactSecrets', 'sanitiseTask',
    'createMemoryStore', 'newApprovalRequest', 'canExecuteApproval', 'auditEvent', 'versionStamp']) {
    expect(typeof (core as Record<string, unknown>)[name]).not.toBe('undefined')
  }
})
it('does not load node:sqlite on import (only when a store is opened)', () => {
  // Built-ins never appear in require.cache, so watch the loader instead.
  const p = process as unknown as { getBuiltinModule: (id: string) => unknown }
  const spy = jest.spyOn(p, 'getBuiltinModule')
  try {
    jest.isolateModules(() => { require('../src') })
    expect(spy.mock.calls.some(([id]) => String(id).includes('sqlite'))).toBe(false)
  } finally {
    spy.mockRestore()
  }
})
