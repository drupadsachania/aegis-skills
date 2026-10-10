import { AsyncLocalStorage } from 'node:async_hooks'
import { SystemMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages'
import { ProviderUnavailableError, redactSecrets, type LLMRequest, type LLMResponse } from '@aegis-skills/themis-core'
import { loadConfig } from '../config/config'
import { KeyStore } from '../config/keys'
import { chatModel } from './models'
import { PROVIDER_ORDER, isProviderId, modelFor, type ProviderId } from './catalog'

const als = new AsyncLocalStorage<{ provider: ProviderId }>()

/** Runs fn with `provider` as the provider for every llm() call made inside it. */
export function withProvider<T>(provider: ProviderId, fn: () => T): T {
  return als.run({ provider }, fn)
}
export function currentProvider(): ProviderId | undefined { return als.getStore()?.provider }

export function configuredProviders(): ProviderId[] {
  const cfg = loadConfig()
  const keys = new KeyStore()
  return PROVIDER_ORDER.filter((p) => (p === 'local' ? cfg.local.model.length > 0 : !!keys.get(p)))
}

export function resolveProvider(requested?: string): ProviderId {
  const configured = configuredProviders()
  if (requested !== undefined) {
    if (isProviderId(requested) && configured.includes(requested)) return requested
    throw new ProviderUnavailableError(`Requested provider not configured: ${requested}`)
  }
  const def = loadConfig().defaultProvider
  if (def && configured.includes(def)) return def
  if (configured[0]) return configured[0]
  throw new ProviderUnavailableError('No AI providers configured')
}

/** o1-family models reject a system role (carried over from apps/web provider.ts). */
export function supportsSystemRole(model: string): boolean { return !/^o1(-|$)/.test(model) }

const FENCE = /^```(?:json)?\s*([\s\S]*?)\s*```$/
function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((c) => (c && typeof c === 'object' && typeof (c as { text?: unknown }).text === 'string' ? (c as { text: string }).text : '')).join('')
  }
  return ''
}

/**
 * Drop-in replacement for apps/web's provider.ts `llm()`. The moved reasoning
 * modules call this unchanged. `req.provider` is ignored: the run's provider
 * comes from withProvider(); outside a run, resolveProvider() picks one.
 */
export async function llm(req: LLMRequest): Promise<LLMResponse> {
  const provider = currentProvider() ?? resolveProvider()
  const modelName = modelFor(provider, req.tier, loadConfig())
  const model = chatModel(provider, req.tier, { maxTokens: req.maxTokens, temperature: req.temperature })
  const messages: BaseMessage[] = supportsSystemRole(modelName)
    ? [new SystemMessage(req.systemPrompt), new HumanMessage(req.userMessage)]
    : [new HumanMessage(`${req.systemPrompt}\n\n${req.userMessage}`)]
  const start = Date.now()
  let res
  try {
    res = await model.invoke(messages)
  } catch (e) {
    throw new ProviderUnavailableError(`${provider} request failed: ${e instanceof Error ? e.name : 'error'}`)
  }
  let content = textOf(res.content).trim()
  const fenced = FENCE.exec(content)
  if (fenced) content = fenced[1]
  return {
    content: redactSecrets(content),
    model: modelName,
    provider: provider as unknown as LLMResponse['provider'],
    inputTokens: res.usage_metadata?.input_tokens ?? 0,
    outputTokens: res.usage_metadata?.output_tokens ?? 0,
    latencyMs: Date.now() - start,
  }
}
