/**
 * SECURITY: the ONLY file in themis-app that imports @langchain/anthropic,
 * @langchain/openai or @langchain/google-genai (enforced by Task 24's guard test).
 */
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ProviderUnavailableError, type Tier } from '@aegis-skills/themis-core'
import { loadConfig, type ThemisConfig } from '../config/config'
import { KeyStore } from '../config/keys'
import { modelFor, type ProviderId } from './catalog'

export interface ModelOpts { maxTokens?: number; temperature?: number }
export interface ModelDeps { config: ThemisConfig; keys: KeyStore }
export type ChatModelFactory = (provider: ProviderId, tier: Tier, opts: ModelOpts) => BaseChatModel

let override: ChatModelFactory | null = null
/** Tests only: replace every model with a scripted one. Pass null to restore. */
export function setChatModelFactoryForTests(f: ChatModelFactory | null): void { override = f }

/** OpenAI reasoning models (o1, o3, …) reject `temperature`. */
const isReasoningModel = (model: string): boolean => /^o\d/.test(model)

export function chatModel(provider: ProviderId, tier: Tier, opts: ModelOpts = {}, deps?: ModelDeps): BaseChatModel {
  if (override) return override(provider, tier, opts)
  const config = deps?.config ?? loadConfig()
  const keys = deps?.keys ?? new KeyStore()
  const model = modelFor(provider, tier, config)
  const maxTokens = opts.maxTokens ?? 2048
  const temperature = opts.temperature ?? 0.3

  if (provider === 'anthropic') {
    const apiKey = keys.get('anthropic')
    if (!apiKey) throw new ProviderUnavailableError('ANTHROPIC_API_KEY not configured')
    return new ChatAnthropic({ model, apiKey, maxTokens, temperature, maxRetries: 2 })
  }
  if (provider === 'openai') {
    const apiKey = keys.get('openai')
    if (!apiKey) throw new ProviderUnavailableError('OPENAI_API_KEY not configured')
    return new ChatOpenAI({
      model, apiKey, maxTokens, maxRetries: 2, timeout: 60000,
      temperature: isReasoningModel(model) ? undefined : temperature,
    })
  }
  if (provider === 'google') {
    const apiKey = keys.get('google')
    if (!apiKey) throw new ProviderUnavailableError('GOOGLE_API_KEY not configured')
    return new ChatGoogleGenerativeAI({ model, apiKey, maxOutputTokens: maxTokens, temperature, maxRetries: 2 })
  }
  if (provider === 'local') {
    if (!model) throw new ProviderUnavailableError('Local model not configured')
    return new ChatOpenAI({
      model,
      apiKey: keys.get('local') ?? 'not-needed', // Ollama/LM Studio ignore it; the client requires one
      maxTokens, temperature, maxRetries: 1, timeout: 120000,
      configuration: { baseURL: config.local.baseURL },
    })
  }
  throw new ProviderUnavailableError(`Unknown provider: ${String(provider)}`)
}
