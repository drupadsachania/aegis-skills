// Host-facing instructions for each reasoning step. No prompt text is authored
// here: it comes from themis-core's builders, so Mode 1 and Mode 2 reason over
// identical text. The only additions are the submit contract and a mapping of
// the LangGraph tool names the core prompts mention to their Mode 1 equivalents.
import {
  decomposeSystemPrompt, decomposeUserMessage, skillAgentSystemPrompt, skillAgentUserMessage,
  guardrailSystemPrompt, guardrailUserMessage, synthesiseSystemPrompt, synthesiseUserMessage,
  readySubTasks, synthesisableResults, type RunState,
} from '@aegis-skills/themis-core'
import { OUTPUT_HINT, type ReasoningStep } from './step-io'

const TOOL_MAP =
  'Tool mapping for this host: "fetch_skill_phase" = the Aegis MCP tool get_skill_phase (or read the skill from your installed Aegis skills); ' +
  '"read_findings" = themis_get_run. Use external security tools ONLY through themis_external_list / themis_external_call.'

function submit(step: ReasoningStep): string {
  return `When done, call themis_submit_step with step="${step}" and output shaped exactly like:\n${OUTPUT_HINT[step]}`
}

export function promptFor(step: ReasoningStep, run: RunState, skillSlugs: string[]): string {
  switch (step) {
    case 'decompose':
      return [decomposeSystemPrompt(skillSlugs), '', decomposeUserMessage(run.task), '', submit(step)].join('\n')
    case 'fanout': {
      const ready = readySubTasks(run)
      return [
        skillAgentSystemPrompt(), '', TOOL_MAP, '',
        ...ready.flatMap((t) => [`--- sub-task ${t.id} ---`, skillAgentUserMessage(t), '']),
        submit(step),
      ].join('\n')
    }
    case 'guardrail':
      return [
        guardrailSystemPrompt(), '',
        'Review EACH result below separately and give one verdict per result.', '',
        ...run.results.flatMap((r) => [guardrailUserMessage(r), '']),
        submit(step),
      ].join('\n')
    case 'synthesise':
      return [synthesiseSystemPrompt(), '', synthesiseUserMessage(synthesisableResults(run.results)), '', submit(step)].join('\n')
  }
}
