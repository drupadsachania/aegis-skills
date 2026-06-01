import { AuditRequest, Standard } from './types'

const VALID_STANDARDS: Standard[] = [
  'cis-l1', 'cis-l2', 'nist-csf', 'iso27001', 'soc2',
  'pci-dss', 'hipaa', 'iec-62443', 'nist-800-53',
]

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
