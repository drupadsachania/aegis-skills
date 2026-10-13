/** Parse the audit classification response. Throws on invalid JSON (caller falls back). */
export function parseAuditClassification(content: string, fallbackSystemType: string): { systemType: string; applicableSkills: string[] } {
  const parsed = JSON.parse(content) as { systemType?: unknown; applicableSkills?: unknown }
  return {
    systemType: typeof parsed.systemType === 'string' ? parsed.systemType : fallbackSystemType,
    applicableSkills: Array.isArray(parsed.applicableSkills)
      ? (parsed.applicableSkills as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 4)
      : [],
  }
}
