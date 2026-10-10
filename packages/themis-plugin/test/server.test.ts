import { setup } from './helpers'

it('registers the workflow, capability and gateway tools', () => {
  const { deps, server } = setup()
  const names = Object.keys((server as unknown as { _registeredTools: object })._registeredTools)
  for (const n of ['themis_start_run', 'themis_submit_step', 'themis_get_run', 'themis_list_runs',
    'themis_validate_exposure', 'themis_assess_risk', 'themis_record_finding', 'themis_get_report',
    'themis_external_list', 'themis_external_call']) expect(names).toContain(n)
  deps.close()
})
