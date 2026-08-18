'use strict'

// Routing table: maps intel signals (tags, categories, free-text keywords) to the
// Aegis skills whose surface the pattern actually lands on. Route on MECHANISM,
// not headline — a water-utility breach entered via a VPN CVE belongs to
// operational-technology, network-security AND identity-access-management.
//
// `kw` terms are matched case-insensitively against title + summary + tags.
// Keep terms specific enough to avoid over-routing; every skill that matches gets
// the item written into its live-threat-intel block.

const ROUTES = [
  {
    skill: 'attack-surface-mapping',
    tags: ['exposed', 'internet-facing', 'shadow-it', 'zero-day', 'edge'],
    kw: ['internet-facing', 'exposed to the internet', 'publicly accessible', 'shodan',
         'censys', 'attack surface', 'unauthenticated', 'edge device', 'perimeter']
  },
  {
    skill: 'application-security',
    tags: ['vulnerability', 'rce', 'devops', 'ci-cd', 'open-source', 'supply-chain', 'api'],
    kw: ['graphql', 'api flaw', 'sql injection', 'xss', 'deserialization', 'github actions',
         'ci/cd', 'pipeline', 'npm', 'pypi', 'dependency', 'sast', 'webapp', 'web application',
         'code injection', 'command injection', 'path traversal', 'ssrf']
  },
  {
    skill: 'identity-access-management',
    tags: ['credentials', 'mfa', 'identity', 'oauth', 'sso'],
    kw: ['credential', 'password', 'mfa', 'multi-factor', 'passkey', 'token theft',
         'session token', 'oauth', 'saml', 'sso', 'active directory', 'kerberos',
         'certificate', 'ad cs', 'privilege escalation', 'admin account', 'aitm',
         'adversary-in-the-middle', 'phishing-resistant', 'identity provider']
  },
  {
    skill: 'endpoint-security',
    tags: ['edr', 'endpoint', 'windows', 'macos', 'linux'],
    kw: ['edr', 'endpoint', 'lsass', 'powershell', 'wmi', 'living off the land', 'lolbin',
         'driver', 'rootkit', 'process injection', 'defender', 'antivirus bypass']
  },
  {
    skill: 'network-security',
    tags: ['network', 'vpn', 'router', 'firewall', 'dns'],
    kw: ['router', 'vpn', 'firewall', 'dns hijack', 'dns', 'lateral movement', 'segmentation',
         'soho', 'fortinet', 'cisco', 'palo alto', 'juniper', 'citrix', 'netscaler',
         'man-in-the-middle', 'bgp', 'tunneling']
  },
  {
    skill: 'infrastructure-security',
    tags: ['cloud', 'kubernetes', 'container', 'iac'],
    kw: ['aws', 'azure', 'gcp', 'kubernetes', 'container', 'docker', 'terraform',
         'cloud misconfiguration', 's3 bucket', 'iam role', 'control plane', 'hypervisor',
         'vmware', 'esxi', 'virtualization']
  },
  {
    skill: 'data-loss-prevention',
    tags: ['third-party-breach', 'tax-data', 'leak-site', 'data-breach', 'pii'],
    kw: ['data breach', 'exfiltrat', 'stolen data', 'records exposed', 'leak site',
         'customer data', 'personal information', 'pii', 'phi', 'database exposed',
         'driver\'s license', 'ssn', 'insider']
  },
  {
    skill: 'operational-technology',
    tags: ['ics', 'scada', 'ot', 'plc', 'critical-infrastructure', 'manufacturing', 'energy'],
    kw: ['plc', 'scada', 'ics', 'operational technology', 'water utility', 'water treatment',
         'power grid', 'substation', 'modbus', 'dnp3', 'rockwell', 'allen-bradley', 'siemens s7',
         'safety instrumented', 'purdue', 'industrial control']
  },
  {
    skill: 'mitre-atlas',
    tags: ['ai_redteam', 'ai_builders', 'agent-safety', 'llm', 'ai'],
    kw: ['prompt injection', 'jailbreak', 'llm', 'large language model', 'model poisoning',
         'training data', 'ai agent', 'agentic', 'model weights', 'hugging face',
         'adversarial example', 'ai safety', 'copilot', 'mcp server']
  },
  {
    skill: 'malware-analysis',
    tags: ['malware', 'ransomware', 'loader', 'rat', 'stealer'],
    kw: ['malware', 'ransomware', 'loader', 'trojan', 'infostealer', 'stealer', 'backdoor',
         'rat ', 'payload', 'dropper', 'wiper', 'botnet', 'c2', 'command and control']
  },
  {
    skill: 'reverse-engineering',
    tags: ['firmware', 'binary', 'packer'],
    kw: ['reverse engineer', 'firmware', 'binary analysis', 'packed', 'obfuscat',
         'disassembl', 'ghidra', 'ida pro', 'shellcode', 'unpacking']
  },
  {
    skill: 'digital-forensics',
    tags: ['incident-response', 'forensics', 'dfir'],
    kw: ['incident response', 'forensic', 'dfir', 'artifact', 'memory dump', 'timeline analysis',
         'dwell time', 'post-mortem', 'compromise assessment']
  },
  {
    skill: 'threat-hunting',
    tags: ['apt', 'threat-hunting', 'campaign'],
    kw: ['apt', 'threat actor', 'campaign', 'hunting', 'espionage', 'nation-state',
         'state-sponsored', 'intrusion set', 'dwell', 'persistence']
  },
  {
    skill: 'security-operations',
    tags: ['soc', 'siem', 'detection', 'ransomware'],
    kw: ['soc analyst', 'siem', 'detection rule', 'security operations', 'incident triage',
         'response playbook', 'mttr', 'threat detection', 'log source']
  },
  {
    skill: 'deception-engineering',
    tags: ['honeypot', 'deception', 'canary'],
    kw: ['honeypot', 'honeytoken', 'canary', 'deception', 'decoy', 'tarpit']
  },
  {
    skill: 'mitre-engage',
    tags: ['deception', 'adversary-engagement'],
    kw: ['adversary engagement', 'deception operation', 'engage']
  },
  {
    skill: 'threat-modeling',
    tags: ['threat-model', 'design-flaw'],
    kw: ['threat model', 'design flaw', 'architectural', 'trust boundary', 'attack tree',
         'stride', 'novel technique', 'new attack']
  },
  {
    skill: 'mitre-attack',
    tags: ['ttp', 'technique'],
    kw: ['mitre att&ck', 'att&ck', 'ttp', 'technique t1', 'tactic']
  },
  {
    skill: 'compliance',
    tags: ['regulation', 'compliance', 'gdpr', 'hipaa', 'pci'],
    kw: ['gdpr', 'hipaa', 'pci dss', 'sox', 'compliance', 'regulator', 'fine', 'penalty',
         'disclosure requirement', 'sec rule', 'nis2', 'dora', 'audit finding']
  },
  {
    skill: 'governance',
    tags: ['policy', 'governance', 'board'],
    kw: ['governance', 'policy', 'board', 'ciso', 'accountability', 'oversight',
         'security program', 'framework adoption']
  },
  {
    skill: 'risk-management',
    tags: ['risk', 'third-party', 'vendor', 'supply-chain'],
    kw: ['risk assessment', 'third-party risk', 'vendor risk', 'supply chain risk',
         'cyber insurance', 'business impact', 'risk register']
  },
  {
    skill: 'security-documentation',
    tags: ['advisory', 'report'],
    kw: ['advisory published', 'guidance', 'best practice', 'playbook published',
         'documentation', 'runbook']
  },
  {
    // Every routed item also informs the synthesis skill itself.
    skill: 'threat-intel-synthesis',
    tags: ['threat_intel'],
    kw: ['threat intelligence', 'campaign', 'attribution', 'indicator', 'ioc']
  }
]

function haystack(item) {
  return [
    item.title || '',
    item.summary || '',
    (item.tags || []).join(' '),
    (item.orgs || []).join(' '),
    (item.actors || []).join(' '),
    item.category || ''
  ].join(' ').toLowerCase()
}

// Minimum score to route. A single generic keyword hit (score 1) is not enough —
// it needs an explicit tag/category match (worth 2) or corroborating keywords.
// Without this floor one loose term routes half the corpus into a skill and the
// live-intel block becomes noise instead of signal.
const MIN_SCORE = 2

// Returns the skill slugs an item routes to, with a match score for ranking.
function routeItem(item, minScore = MIN_SCORE) {
  const hay = haystack(item)
  const itemTags = new Set((item.tags || []).map(t => String(t).toLowerCase()))
  const cat = String(item.category || '').toLowerCase()
  const hits = []

  for (const route of ROUTES) {
    let score = 0
    for (const t of (route.tags || [])) {
      if (itemTags.has(t) || cat === t) score += 2
    }
    for (const k of (route.kw || [])) {
      if (hay.includes(k)) score += 1
    }
    if (score >= minScore) hits.push({ skill: route.skill, score })
  }

  hits.sort((a, b) => b.score - a.score)
  return hits
}

module.exports = { ROUTES, routeItem, haystack }
