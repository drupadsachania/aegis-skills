import { sanitiseTask, normaliseSubTasks, parseDecomposeResponse, decomposeSystemPrompt, decomposeUserMessage, type OrchestrateRequest, type SubTask } from '@aegis-skills/themis-core'
import { llm } from '../providers/llm'
import { enabledSkillSlugs } from '../skills/aegis'

async function callDecompose(sanitisedTask: string, skillSlugs: string[], provider?: OrchestrateRequest['provider']): Promise<SubTask[]> {
  const response = await llm({
    systemPrompt: decomposeSystemPrompt(skillSlugs),
    userMessage: decomposeUserMessage(sanitisedTask),
    maxTokens: 2048,
    temperature: 0.2,
    tier: 'fast',
    provider,
  })
  return parseDecomposeResponse(response.content)
}

export async function decompose(req: OrchestrateRequest): Promise<SubTask[]> {
  // Sanitise first — propagate ValidationError if thrown
  const sanitisedTask = sanitiseTask(req.task)

  const skillSlugs = enabledSkillSlugs()
  if (skillSlugs.length === 0) throw new Error('No Aegis skills are enabled')

  try {
    return normaliseSubTasks(await callDecompose(sanitisedTask, skillSlugs, req.provider), skillSlugs)
  } catch {
    // Retry once on parse failure
    try {
      return normaliseSubTasks(await callDecompose(sanitisedTask, skillSlugs, req.provider), skillSlugs)
    } catch (retryErr) {
      throw new Error('Decompose failed after retry: ' + (retryErr instanceof Error ? retryErr.message : 'Unknown error'))
    }
  }
}
