import { LLMRequest, LLMResponse, Provider, Tier, ProviderUnavailableError } from './types'
import { redactSecrets } from './secrets'

const MODELS: Record<Provider, Record<Tier, string>> = {
  anthropic: {
    fast: 'claude-haiku-4-5-20251001',
    standard: 'claude-sonnet-4-6',
    power: 'claude-opus-4-6',
  },
  openai: {
    fast: 'gpt-4o-mini',
    standard: 'gpt-4o',
    power: 'o1',
  },
  google: {
    fast: 'gemini-2.0-flash',
    standard: 'gemini-2.5-pro',
    power: 'gemini-2.5-pro',
  },
}

export function availableProviders(): Provider[] {
  const result: Provider[] = []
  if (process.env.ANTHROPIC_API_KEY) result.push('anthropic')
  if (process.env.OPENAI_API_KEY) result.push('openai')
  if (process.env.GOOGLE_API_KEY) result.push('google')
  return result
}

export async function llm(req: LLMRequest): Promise<LLMResponse> {
  const provider = req.provider ?? availableProviders()[0]
  if (!provider) {
    throw new ProviderUnavailableError('No providers available — no API keys configured')
  }

  const model = MODELS[provider][req.tier]
  const start = Date.now()

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new ProviderUnavailableError('Anthropic API key not configured')

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey, timeout: 45000 })

    const message = await client.messages.create({
      model,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userMessage }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    const content = redactSecrets(rawContent)

    return {
      content,
      model,
      provider: 'anthropic',
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      latencyMs: Date.now() - start,
    }
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new ProviderUnavailableError('OpenAI API key not configured')

    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey, timeout: 45000 })

    // o1 model: no system message — prepend system content to user message
    const isO1 = model === 'o1'
    const messages: Array<{ role: 'user' | 'system'; content: string }> = isO1
      ? [{ role: 'user', content: `[Context]:\n${req.systemPrompt}\n\n[Task]:\n${req.userMessage}` }]
      : [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userMessage },
        ]

    const completion = await client.chat.completions.create({
      model,
      max_tokens: req.maxTokens,
      temperature: isO1 ? undefined : req.temperature,
      messages,
    })

    const rawContent = completion.choices[0]?.message?.content ?? ''
    const content = redactSecrets(rawContent)

    return {
      content,
      model,
      provider: 'openai',
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
    }
  }

  if (provider === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new ProviderUnavailableError('Google API key not configured')

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey)
    const googleModel = genAI.getGenerativeModel({ model })

    // Google SDK doesn't have a direct timeout option; we use AbortSignal
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45000)

    try {
      const result = await googleModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: req.userMessage }] }],
        systemInstruction: req.systemPrompt,
        generationConfig: {
          maxOutputTokens: req.maxTokens,
          temperature: req.temperature,
        },
      })

      clearTimeout(timer)

      const rawContent = result.response.text()
      const content = redactSecrets(rawContent)

      const usage = result.response.usageMetadata
      return {
        content,
        model,
        provider: 'google',
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        latencyMs: Date.now() - start,
      }
    } catch (err) {
      clearTimeout(timer)
      if (controller.signal.aborted) {
        throw new ProviderUnavailableError('Google request timed out after 45 seconds')
      }
      throw new ProviderUnavailableError(`Google request failed: ${String(err)}`)
    }
  }

  throw new ProviderUnavailableError(`Unknown provider: ${provider}`)
}
