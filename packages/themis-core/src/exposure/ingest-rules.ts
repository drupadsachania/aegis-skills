/** Parse the exposure classification response. Throws on invalid JSON (caller falls back). */
export function parseExposureClassification(content: string, fallbackSystemType: string): {
  systemType: string; affectedProduct: string; applicableSkills: string[]
} {
  const parsed = JSON.parse(content) as { systemType?: unknown; affectedProduct?: unknown; applicableSkills?: unknown }
  return {
    systemType: typeof parsed.systemType === 'string' ? parsed.systemType : fallbackSystemType,
    affectedProduct: typeof parsed.affectedProduct === 'string' ? parsed.affectedProduct : '',
    applicableSkills: Array.isArray(parsed.applicableSkills)
      ? (parsed.applicableSkills as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 4)
      : [],
  }
}

/** The exposure-validation skill always anchors the workflow. */
export function anchorExposureSkill(skills: string[]): string[] {
  return skills.includes('exposure-validation') ? skills : ['exposure-validation', ...skills].slice(0, 4)
}
