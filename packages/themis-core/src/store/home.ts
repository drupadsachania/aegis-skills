import os from 'node:os'
import path from 'node:path'

/** $THEMIS_HOME, else ~/.themis. Holds themis.db, config.json and .env (contracts §6). */
export function themisHome(): string {
  const v = process.env.THEMIS_HOME?.trim()
  return v ? path.resolve(v) : path.join(os.homedir(), '.themis')
}
