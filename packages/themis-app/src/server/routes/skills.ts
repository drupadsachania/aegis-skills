import type { Router } from '../router'
import { HttpError, asObject, sendJson } from '../respond'
import { AEGIS_PACKAGE } from '../../versions'

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

export function registerSkillRoutes(r: Router): void {
  r.add('GET', '/api/skills', ({ res, deps }) => {
    sendJson(res, 200, {
      aegis: { package: AEGIS_PACKAGE, version: deps.versions.aegis, osk: deps.versions.osk },
      skills: deps.skills.list(),
    })
  })

  r.add('PUT', '/api/skills/:name', async ({ res, params, body, deps }) => {
    const name = params.name
    if (!NAME_RE.test(name)) throw new HttpError(400, 'Request invalid')
    if (!deps.skills.list().some((s) => s.name === name)) throw new HttpError(404, 'Not found')
    const enabled = asObject(await body()).enabled
    if (typeof enabled !== 'boolean') throw new HttpError(400, 'Request invalid')
    deps.config.update((c) => {
      c.skills.disabled = enabled ? c.skills.disabled.filter((n) => n !== name) : [...new Set([...c.skills.disabled, name])]
    })
    sendJson(res, 200, { name, enabled })
  })
}
