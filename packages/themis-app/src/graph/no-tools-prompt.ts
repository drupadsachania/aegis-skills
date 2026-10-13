import { skillAgentUserMessage, type SubTask } from '@aegis-skills/themis-core'

export const NO_TOOLS_NOTE =
  'Tools are not available in this session. The methodology and earlier findings are provided below; use them instead of calling tools.'

export function noToolsUserMessage(subTask: SubTask, methodology: string, priorFindings: string): string {
  return [
    skillAgentUserMessage(subTask),
    '',
    NO_TOOLS_NOTE,
    '',
    `<methodology>\n${methodology}\n</methodology>`,
    '',
    `<prior_findings>\n${priorFindings}\n</prior_findings>`,
  ].join('\n')
}
