/**
 * llm-factory.ts
 *
 * Creates LangChain BaseChatModel instances per provider/tier.
 *
 * SECURITY: This is the ONLY file in the project allowed to import
 * @langchain/anthropic, @langchain/openai, or @langchain/google-genai.
 * All other modules that need a chat model must call modelForTier() here.
 */
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { Provider, Tier } from './types'
import { ProviderUnavailableError } from './types'

// Mirror the model map from provider.ts — same models, LangChain wrapper instances
const ANTHROPIC_MODELS: Record<Tier, string> = {
  fast: 'claude-haiku-4-5-20251001',
  standard: 'claude-sonnet-4-6',
  power: 'claude-opus-4-6',
}

const OPENAI_MODELS: Record<Tier, string> = {
  fast: 'gpt-4o-mini',
  standard: 'gpt-4o',
  power: 'o1',
}

const GOOGLE_MODELS: Record<Tier, string> = {
  fast: 'gemini-2.0-flash',
  standard: 'gemini-2.5-pro',
  power: 'gemini-2.5-pro',
}

/**
 * Returns a configured LangChain BaseChatModel for the given provider and tier.
 * API keys are read from process.env at call time (not module load time).
 * Throws ProviderUnavailableError if the API key is missing.
 */
export function modelForTier(tier: Tier, provider: Provider): BaseChatModel {
  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new ProviderUnavailableError('ANTHROPIC_API_KEY not configured')
    return new ChatAnthropic({
      model: ANTHROPIC_MODELS[tier],
      apiKey,
      maxTokens: 2048,
      temperature: 0.3,
    })
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new ProviderUnavailableError('OPENAI_API_KEY not configured')
    const modelName = OPENAI_MODELS[tier]
    return new ChatOpenAI({
      model: modelName,
      apiKey,
      maxTokens: 2048,
      // o1 does not accept temperature
      temperature: modelName === 'o1' ? undefined : 0.3,
    })
  }

  if (provider === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new ProviderUnavailableError('GOOGLE_API_KEY not configured')
    return new ChatGoogleGenerativeAI({
      model: GOOGLE_MODELS[tier],
      apiKey,
      maxOutputTokens: 2048,
      temperature: 0.3,
    })
  }

  throw new ProviderUnavailableError(`Unknown provider: ${String(provider)}`)
}
