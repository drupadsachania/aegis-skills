import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import type { ThemisState } from './state'

// Import skill-reader via the @/ alias so Jest module mocks intercept it correctly
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPhaseContent } = require('@/lib/skill-reader') as {
  getPhaseContent: (skillName: string, phaseId: string) => Promise<string | null>
}

const BLOCKED_CONTENT_PATTERNS = [/<script/i, /javascript:/i, /data:/i, /eval\(/i]

function validatePhaseContent(text: string): boolean {
  if (!text || text.length === 0) return false
  if (text.length > 8000) return false
  return !BLOCKED_CONTENT_PATTERNS.some(p => p.test(text))
}

/**
 * fetchSkillPhaseTool
 *
 * Loaded into each skill agent. Retrieves the phase instructions for a given
 * skill from the local filesystem (via skill-reader.js) and applies the same
 * integrity checks used in dispatch.ts.
 *
 * Returns a string (content or error message) — never throws, because a tool
 * that throws will abort the ReAct loop.
 */
export const fetchSkillPhaseTool = new DynamicStructuredTool({
  name: 'fetch_skill_phase',
  description:
    'Retrieve the methodology content for a specific skill phase. ' +
    'Use this to get structured analysis guidance before producing findings.',
  schema: z.object({
    skillName: z.string().describe('The skill slug (e.g. "mitre-attack", "threat-modeling")'),
    phaseId: z.string().describe('The phase identifier (e.g. "0", "recon", "phase-1")'),
  }),
  func: async ({ skillName, phaseId }: { skillName: string; phaseId: string }): Promise<string> => {
    try {
      const content: string | null = await getPhaseContent(skillName, phaseId)
      if (content === null) {
        return `Skill phase "${skillName}/${phaseId}" not found or not accessible.`
      }
      if (!validatePhaseContent(content)) {
        return `Skill phase "${skillName}/${phaseId}" failed integrity check — content rejected.`
      }
      return content
    } catch {
      return `Skill phase "${skillName}/${phaseId}" is temporarily unavailable.`
    }
  },
})

/**
 * makeReadFindingsTool
 *
 * Factory that captures a snapshot of the current ThemisState and returns a
 * tool that skill agents can use to read findings already produced by other
 * skill agents. Enables cross-agent awareness.
 *
 * In the initial fan-out, subTaskResults is empty — agents see findings from
 * previously checkpointed runs (resumed sessions via threadId). In multi-turn
 * sessions this enables each agent to build on prior work.
 *
 * If skill is empty string, returns all available findings.
 */
export function makeReadFindingsTool(state: Pick<ThemisState, 'subTaskResults'>): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'read_findings',
    description:
      'Read findings already produced by other skill agents in this session. ' +
      'Useful for cross-referencing or building on prior analysis. ' +
      'Pass an empty skill string to read findings from all skills.',
    schema: z.object({
      skill: z
        .string()
        .describe('Filter findings by skill slug, or empty string for all skills'),
    }),
    func: async ({ skill }: { skill: string }): Promise<string> => {
      const results = state.subTaskResults ?? []
      const filtered = skill
        ? results.filter(r => r.skill === skill)
        : results

      if (filtered.length === 0) {
        return `No findings available${skill ? ` for skill "${skill}"` : ''} yet.`
      }

      return filtered
        .map(r => `[${r.skill} / ${r.subTaskId}] (confidence: ${r.confidence})\n${r.findings}`)
        .join('\n\n---\n\n')
    },
  })
}
