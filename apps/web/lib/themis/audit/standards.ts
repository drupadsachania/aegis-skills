import { AuditRequest, Standard } from './types'

const VALID_STANDARDS: Standard[] = [
  'cis-l1', 'cis-l2', 'nist-csf', 'iso27001', 'soc2',
  'pci-dss', 'hipaa', 'iec-62443', 'nist-800-53',
]

// Maps each standard to the most relevant Aegis skill slugs
const STANDARD_SKILL_MAP: Record<Standard, string[]> = {
  'cis-l1':       ['application-security', 'network-security', 'endpoint-security'],
  'cis-l2':       ['application-security', 'network-security', 'infrastructure-security'],
  'nist-csf':     ['risk-management', 'governance', 'security-operations'],
  'iso27001':     ['compliance', 'governance', 'risk-management'],
  'soc2':         ['compliance', 'governance', 'identity-access-management'],
  'pci-dss':      ['compliance', 'application-security', 'network-security'],
  'hipaa':        ['compliance', 'identity-access-management', 'digital-forensics'],
  'iec-62443':    ['operational-technology', 'network-security', 'risk-management'],
  'nist-800-53':  ['compliance', 'risk-management', 'identity-access-management'],
}

export function skillsForStandards(standards: Standard[]): string[] {
  const slugs = new Set<string>()
  for (const std of standards) {
    for (const slug of (STANDARD_SKILL_MAP[std] ?? [])) {
      slugs.add(slug)
    }
  }
  return [...slugs].slice(0, 6) // cap at 6 skills per audit run
}

export function selectStandards(req: AuditRequest, detectedSystemType: string): Standard[] {
  // If user-specified standards, filter to valid values and cap at 4
  if (req.standards && req.standards.length > 0) {
    const valid = req.standards.filter((s): s is Standard => VALID_STANDARDS.includes(s as Standard))
    return valid.slice(0, 4)
  }

  // Auto-detect based on system type
  const st = detectedSystemType.toLowerCase()
  const selected = new Set<Standard>()

  // OT/ICS networks
  if (/ot|plc|scada|ics/.test(st)) {
    selected.add('iec-62443')
  }

  // Cloud/container environments
  if (/cloud|k8s|aws|azure|gcp/.test(st)) {
    selected.add('cis-l1')
    selected.add('nist-csf')
  }

  // Payment/PCI
  if (/payment|pci|cardholder/.test(st)) {
    selected.add('pci-dss')
  }

  // Healthcare/HIPAA
  if (/health|hipaa|phi/.test(st)) {
    selected.add('hipaa')
  }

  // Default always included
  selected.add('cis-l1')
  selected.add('nist-csf')

  // Deduplicate and cap at 4
  const result = Array.from(selected)
  return result.slice(0, 4)
}
