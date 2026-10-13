import { paths } from './config'
import { readEnvFile, writeEnvFile, isValidEnvValue } from './env-file'
import type { ProviderId } from '../providers/catalog'

export const KEY_VARS: Record<ProviderId, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  local: 'THEMIS_LOCAL_API_KEY',
}

export interface KeyStatus {
  provider: ProviderId
  envVar: string
  status: 'set' | 'missing' | 'optional'
  source: 'env' | 'file' | null
  masked: string | null
}

export class KeyError extends Error {
  constructor(message: string) { super(message); this.name = 'KeyError' }
}

/** Never returns more than 3 leading + 4 trailing characters. */
export function mask(value: string): string {
  return value.length <= 8 ? '••••' : `${value.slice(0, 3)}…${value.slice(-4)}`
}

export class KeyStore {
  constructor(readonly file: string = paths().env, private readonly env: NodeJS.ProcessEnv = process.env) {}

  get(p: ProviderId): string | undefined {
    const fromEnv = this.env[KEY_VARS[p]]?.trim()
    return fromEnv || readEnvFile(this.file).get(KEY_VARS[p])
  }

  status(p: ProviderId): KeyStatus {
    const envVar = KEY_VARS[p]
    const fromEnv = this.env[envVar]?.trim()
    const fromFile = readEnvFile(this.file).get(envVar)
    const value = fromEnv || fromFile
    return {
      provider: p,
      envVar,
      status: value ? 'set' : p === 'local' ? 'optional' : 'missing',
      source: fromEnv ? 'env' : fromFile ? 'file' : null,
      masked: value ? mask(value) : null,
    }
  }

  set(p: ProviderId, value: string): KeyStatus {
    if (!isValidEnvValue(value)) throw new KeyError('Key must be 1–4096 printable characters with no spaces')
    const m = readEnvFile(this.file)
    m.set(KEY_VARS[p], value)
    writeEnvFile(this.file, m)
    return this.status(p)
  }

  unset(p: ProviderId): KeyStatus {
    const m = readEnvFile(this.file)
    m.delete(KEY_VARS[p])
    writeEnvFile(this.file, m)
    return this.status(p)
  }
}
