import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { formatFindings, validatePhaseContent, type SubTaskResult } from '@aegis-skills/themis-core'
import { authoredPhaseIds, getPhaseContent, isSkillEnabled } from '../skills/aegis'

/** The decomposer plans 0-based phase indices; skills store string ids. */
export function resolvePhaseId(skill: string, phaseId: string): string {
  if (!/^\d+$/.test(phaseId)) return phaseId
  return authoredPhaseIds(skill)[Number(phaseId)] ?? phaseId
}

/** Methodology text, or a short reason it is unavailable. Never throws. */
export function loadPhase(skill: string, phaseId: string): { ok: boolean; text: string } {
  try {
    if (!isSkillEnabled(skill)) return { ok: false, text: `Skill "${skill}" is disabled in Themis settings.` }
    const content = getPhaseContent(skill, resolvePhaseId(skill, phaseId))
    if (!content) return { ok: false, text: `Skill phase "${skill}/${phaseId}" not found or not accessible.` }
    if (!validatePhaseContent(content)) return { ok: false, text: `Skill phase "${skill}/${phaseId}" failed integrity check — content rejected.` }
    return { ok: true, text: content }
  } catch {
    return { ok: false, text: `Skill phase "${skill}/${phaseId}" is temporarily unavailable.` }
  }
}

export const fetchSkillPhaseTool = new DynamicStructuredTool({
  name: 'fetch_skill_phase',
  description:
    'Retrieve the methodology content for a specific skill phase. ' +
    'Use this to get structured analysis guidance before producing findings.',
  schema: z.object({
    skillName: z.string().describe('The skill slug (e.g. "mitre-attack", "threat-modeling")'),
    phaseId: z.string().describe('The phase id (e.g. "edr-deployment") or its 0-based index (e.g. "0")'),
  }),
  func: async ({ skillName, phaseId }: { skillName: string; phaseId: string }): Promise<string> => loadPhase(skillName, phaseId).text,
})

export function makeReadFindingsTool(results: SubTaskResult[]): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'read_findings',
    description:
      'Read findings already produced by other skill agents in this session. ' +
      'Useful for cross-referencing or building on prior analysis. ' +
      'Pass an empty skill string to read findings from all skills.',
    schema: z.object({ skill: z.string().describe('Filter findings by skill slug, or empty string for all skills') }),
    func: async ({ skill }: { skill: string }): Promise<string> => formatFindings(results, skill),
  })
}
