import { AuditReport, Finding } from './types'

export function score(findings: Finding[]): AuditReport['summary'] {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
    passed: 0,
  }

  for (const finding of findings) {
    if (finding.severity === 'pass') {
      summary.passed++
    } else if (finding.severity === 'critical') {
      summary.critical++
    } else if (finding.severity === 'high') {
      summary.high++
    } else if (finding.severity === 'medium') {
      summary.medium++
    } else if (finding.severity === 'low') {
      summary.low++
    } else if (finding.severity === 'informational') {
      summary.informational++
    }
  }

  return summary
}
