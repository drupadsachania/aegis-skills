export type Tier = 'fast' | 'standard' | 'power'
export type Provider = 'anthropic' | 'openai' | 'google' | 'mistral' | 'deepseek' | 'qwen' | 'nvidia'
export type GuardrailVerdict = 'PASS' | 'FLAG' | 'BLOCK'

export interface LLMRequest {
  systemPrompt: string
  userMessage: string
  maxTokens: number
  temperature: number
  tier: Tier
  provider?: Provider
}

export interface LLMResponse {
  content: string
  model: string       // never sent to client
  provider: Provider  // never sent to client
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

export interface SubTask {
  id: string
  description: string
  skill: string
  phase: number
  tier: Tier
  dependsOn: string[]
}

export interface SubTaskResult {
  subTaskId: string
  skill: string
  findings: string          // redacted before leaving server
  confidence: 'high' | 'medium' | 'low'
  guardrail: GuardrailVerdict
  guardrailReason?: string
  inputTokens: number
  outputTokens: number
}

export interface OrchestrateRequest {
  task: string                    // max 4000 chars after sanitisation
  context: {
    environments: string[]
    attackSurfaceTags: string[]
  }
  provider?: Provider
  threadId?: string   // optional: if provided, resumes an existing session
}

export interface OrchestrateResponse {
  report: string
  subTaskResults: SubTaskResult[]
  guardrailSummary: { passed: number; flagged: number; blocked: number }
  skillTrace: string[]
  totalInputTokens: number
  totalOutputTokens: number
  durationMs: number
  threadId: string    // always returned — use to resume this session
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ProviderUnavailableError extends Error {
  readonly clientMessage = 'AI providers unavailable'
  readonly internalReason: string
  constructor(internalReason: string) {
    super('AI providers unavailable')
    this.name = 'ProviderUnavailableError'
    this.internalReason = internalReason
  }
}

export class ProviderError extends Error {
  readonly clientMessage: string
  readonly internalReason: string
  constructor(clientMessage: string, internalReason: string) {
    super(clientMessage)
    this.name = 'ProviderError'
    this.clientMessage = clientMessage
    this.internalReason = internalReason
  }
}
