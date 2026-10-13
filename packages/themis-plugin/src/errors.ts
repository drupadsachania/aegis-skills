// A tool handler never throws across the MCP boundary; it returns a structured text result.
export interface ToolError { ok: false; error: string; code: string }
export function toolError(code: string, error: string): ToolError { return { ok: false, error, code } }
export function textResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] }
}
export function errorResult(code: string, error: string) {
  return { ...textResult(toolError(code, error)), isError: true }
}
