import { LLMRequest, LLMResponse, Provider, Tier, ProviderUnavailableError } from './types'
import { redactSecrets } from './secrets'

const MODELS: Record<Provider, Record<Tier, string>> = {
  anthropic: {
    fast: 'claude-haiku-4.5',
    standard: 'claude-sonnet-4.6',
    power: 'claude-opus-4.7',
  },
  openai: {
    fast: 'gpt-4o-mini',
    standard: 'gpt-4o',
    power: 'gpt-5.5-pro',
  },
  google: {
    fast: 'gemini-2.0-flash',
    standard: 'gemini-2.5-pro',
    power: 'gemini-3.1-pro',
  },
  mistral: {
    fast: 'ministral-8b-2512',
    standard: 'mistral-small-2603',
    power: 'mistral-large',
  },
  deepseek: {
    fast: 'deepseek-v3.2',
    standard: 'deepseek-v4-flash',
    power: 'deepseek-v4-pro',
  },
  qwen: {
    fast: 'qwen3-next-80b-a3b-instruct',
    standard: 'qwen3.7-max',
    power: 'qwen3-next-80b-a3b-thinking',
  },
  nvidia: {
    fast: 'nemotron-nano-9b-v2',
    standard: 'nemotron-3-nano-30b-a3b',
    power: 'nemotron-3-super-120b-a12b',
  },
}

export function availableProviders(): Provider[] {
  const result: Provider[] = []
  if (process.env.ANTHROPIC_API_KEY) result.push('anthropic')
  if (process.env.OPENAI_API_KEY) result.push('openai')
  if (process.env.GOOGLE_API_KEY) result.push('google')
  if (process.env.MISTRAL_API_KEY) result.push('mistral')
  if (process.env.DEEPSEEK_API_KEY) result.push('deepseek')
  if (process.env.QWEN_API_KEY) result.push('qwen')
  if (process.env.NVIDIA_API_KEY) result.push('nvidia')
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

    const messages: Array<{ role: 'user' | 'system'; content: string }> = [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: req.userMessage },
    ]

    const completion = await client.chat.completions.create({
      model,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
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

  // Generic REST API handler for Mistral, DeepSeek, Qwen, NVIDIA
  if (['mistral', 'deepseek', 'qwen', 'nvidia'].includes(provider)) {
    const envVarMap: Record<string, string> = {
      mistral: 'MISTRAL_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      qwen: 'QWEN_API_KEY',
      nvidia: 'NVIDIA_API_KEY',
    }
    const apiKey = process.env[envVarMap[provider]]
    if (!apiKey) throw new ProviderUnavailableError(`${provider} API key not configured`)

    // Use generic fetch-based approach for REST API providers
    const response = await fetch(`https://api.${provider}.com/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userMessage },
        ],
        max_tokens: req.maxTokens,
        temperature: req.temperature,
      }),
    })

    if (!response.ok) {
      throw new ProviderUnavailableError(`${provider} request failed with status ${response.status}`)
    }

    const data = await response.json()
    const rawContent = data.choices[0]?.message?.content ?? ''
    const content = redactSecrets(rawContent)

    return {
      content,
      model,
      provider: provider as Provider,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
    }
  }

  throw new ProviderUnavailableError(`Unknown provider: ${provider}`)
}
