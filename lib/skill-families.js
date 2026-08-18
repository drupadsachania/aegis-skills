'use strict'

/**
 * Skill families — the five buckets the library is browsed by.
 *
 * Five stable families scale better than the raw tag union: adding a skill fills
 * an existing bucket instead of lengthening a filter list that grows without end.
 *
 * NOTE: this map is the single source of truth today. A new skill that is not
 * listed falls back to DEFAULT_FAMILY and still appears under "All", so the
 * library never silently drops a skill. Longer term this belongs in each
 * SKILL.md as a `family:` field so it travels with the skill.
 */

const FAMILIES = [
  { key: 'framework', label: 'Frameworks' },
  { key: 'intel', label: 'Threat Intel' },
  { key: 'response', label: 'Response & Analysis' },
  { key: 'domain', label: 'Domain Defence' },
  { key: 'governance', label: 'Governance & Risk' }
]

const DEFAULT_FAMILY = 'domain'

const SKILL_FAMILY = {
  'mitre-attack': 'framework',
  'mitre-atlas': 'framework',
  'mitre-engage': 'framework',

  'threat-intel-synthesis': 'intel',
  'threat-hunting': 'intel',
  'threat-modeling': 'intel',
  'attack-surface-mapping': 'intel',

  'security-operations': 'response',
  'digital-forensics': 'response',
  'malware-analysis': 'response',
  'reverse-engineering': 'response',

  'application-security': 'domain',
  'network-security': 'domain',
  'endpoint-security': 'domain',
  'infrastructure-security': 'domain',
  'identity-access-management': 'domain',
  'operational-technology': 'domain',
  'data-loss-prevention': 'domain',
  'deception-engineering': 'domain',

  'compliance': 'governance',
  'governance': 'governance',
  'risk-management': 'governance',
  'security-documentation': 'governance'
}

function familyOf(skillName) {
  return SKILL_FAMILY[skillName] || DEFAULT_FAMILY
}

function labelOf(key) {
  const f = FAMILIES.find(x => x.key === key)
  return f ? f.label : key
}

module.exports = { FAMILIES, SKILL_FAMILY, DEFAULT_FAMILY, familyOf, labelOf }
