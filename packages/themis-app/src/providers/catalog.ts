import type { Tier } from '@aegis-skills/themis-core'
import type { ThemisConfig } from '../config/config'

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'local'
export const PROVIDER_ORDER: ProviderId[] = ['anthropic', 'openai', 'google', 'local']
export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === 'string' && (PROVIDER_ORDER as string[]).includes(v)
}

export interface ProviderInfo {
  id: ProviderId
  label: string
  kind: 'anthropic' | 'openai' | 'google' | 'openai-compatible'
  keyRequired: boolean
  keyUrl: string | null
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: { id: 'anthropic', label: 'Anthropic', kind: 'anthropic', keyRequired: true, keyUrl: 'https://console.anthropic.com/settings/keys' },
  openai: { id: 'openai', label: 'OpenAI', kind: 'openai', keyRequired: true, keyUrl: 'https://platform.openai.com/api-keys' },
  google: { id: 'google', label: 'Google Gemini', kind: 'google', keyRequired: true, keyUrl: 'https://aistudio.google.com/app/apikey' },
  local: { id: 'local', label: 'Local (Ollama / LM Studio)', kind: 'openai-compatible', keyRequired: false, keyUrl: null },
}

/**
 * THE ONLY place model IDs are written down (carried over from apps/web provider.ts).
 * Users override per tier in config.json → models.<provider>.<tier>.
 */
export const DEFAULT_MODELS: Record<Exclude<ProviderId, 'local'>, Record<Tier, string>> = {
  anthropic: { fast: 'claude-haiku-4-5-20251001', standard: 'claude-sonnet-5-5', power: 'claude-opus-5-5' },
  openai: { fast: 'gpt-4o-mini', standard: 'gpt-4o', power: 'gpt-5.5-pro' },
  google: { fast: 'gemini-2.0-flash', standard: 'gemini-2.5-pro', power: 'gemini-3.1-pro' },
}

export const LOCAL_PRESETS = {
  ollama: 'http://127.0.0.1:11434/v1',
  lmstudio: 'http://127.0.0.1:1234/v1',
} as const

/** Local models use one model for every tier. */
export function modelFor(provider: ProviderId, tier: Tier, cfg: ThemisConfig): string {
  if (provider === 'local') return cfg.local.model
  return cfg.models[provider][tier] ?? DEFAULT_MODELS[provider][tier]
}
