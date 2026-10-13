export type Standard = 'cis-l1' | 'cis-l2' | 'nist-csf' | 'iso27001' | 'soc2' | 'pci-dss' | 'hipaa' | 'iec-62443' | 'nist-800-53'
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational' | 'pass'

export interface AuditRequest {
  input: string           // config file content, policy text, or system description — max 12000 chars
  inputType: 'config' | 'policy' | 'description' | 'evidence-package'
  standards: Standard[]   // user-specified; if empty, auto-detect
  context: {
    systemType?: string   // e.g. "linux-server", "k8s-cluster", "aws-account", "ot-network"
    environments: string[]
  }
}

export interface Control {
  id: string             // e.g. "CIS-1.1.1", "ISO-A.9.1.1"
  standard: Standard
  domain: string
  description: string
}

export interface Finding {
  controlId: string
  standard: Standard
  severity: Severity
  title: string
  evidence: string       // what in the input triggered this finding
  recommendation: string
  reference: string      // link to standard section
}

export interface AuditReport {
  executiveSummary: string
  standardsApplied: Standard[]
  findings: Finding[]
  summary: { critical: number; high: number; medium: number; low: number; informational: number; passed: number }
  skillTrace: string[]
  durationMs: number
}
