'use strict'

const React = require('react')
const Head = require('next/head').default
const Layout = require('../components/Layout')

module.exports = function DocsPage() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Head,
      null,
      React.createElement('title', null, 'Documentation — Aegis Skills')
    ),
    React.createElement(
      Layout,
      null,
      React.createElement('div', { style: { position: 'relative', zIndex: 1, paddingTop: '80px' } },
        // ── Doc meta ──
        React.createElement('div', { className: 'doc-meta' },
          React.createElement('span', { className: 'dot' }),
          React.createElement('span', null, 'DEVELOPER GUIDE'),
          React.createElement('span', { className: 'sep' })
        ),

        // ── Title & intro ──
        React.createElement('h1', { className: 'doc-title' }, 'Documentation'),
        React.createElement('p', { className: 'doc-subtitle' }, 'Aegis skill library & Themis orchestration'),
        React.createElement('p', { className: 'doc-intro' },
          'Learn how to discover skills, invoke them individually, use them with Themis for multi-agent analysis, and troubleshoot common issues. All skills are versioned, tagged, and documented.'
        ),

        // ── What is Aegis ──
        React.createElement('section', { className: 'doc-section', id: 'what-is-aegis' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '01'),
            React.createElement('h2', null, 'What is Aegis?')
          ),
          React.createElement('p', null,
            'Aegis is a skill marketplace and compilation system. Each skill is authored in SKILL.md — a single markdown bundle containing metadata, multiple phases, and guidance text. The compiler generates three artifacts:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '12px', marginBottom: '12px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'System Prompt'),
              ' — Ready to paste into ChatGPT, Claude, or your LLM'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'OpenAI Action Schema'),
              ' — For ChatGPT custom actions and function calling'
            ),
            React.createElement('li', null,
              React.createElement('strong', null, 'MCP Manifest'),
              ' — For Model Context Protocol servers'
            )
          ),
          React.createElement('p', null,
            'Skills can be invoked individually through the Aegis API, or chained together through Themis for multi-phase reasoning.'
          )
        ),

        // ── Discovering Skills ──
        React.createElement('section', { className: 'doc-section', id: 'discover' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '02'),
            React.createElement('h2', null, 'Discovering Skills')
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--cream)' } }, 'Browse the Marketplace'),
          React.createElement('p', null,
            'Go to the ',
            React.createElement('a', { href: '/', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'Skills page'),
            ' to browse all available skills. Click any skill to see its full documentation, phases, and installation instructions.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'Skill Properties'),
          React.createElement('p', null,
            'Each skill has:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '8px', marginBottom: '12px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'Name & Version'),
              ' — Unique identifier and semantic version'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'Description'),
              ' — One-line summary of what it does'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'Tags'),
              ' — Keywords: network, endpoint, lateral-movement, detection, etc.'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'Frameworks'),
              ' — mitre-attack, mitre-engage, mitre-atlas, etc.'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'Phases'),
              ' — Usually 3-5 distinct reasoning phases'
            ),
            React.createElement('li', null,
              React.createElement('strong', null, 'Health Score'),
              ' — 0-100 rating based on phase coverage and freshness'
            )
          )
        ),

        // ── Invoking Skills ──
        React.createElement('section', { className: 'doc-section', id: 'invoke' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '03'),
            React.createElement('h2', null, 'Invoking Skills')
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--cream)' } }, 'GET /api/skills'),
          React.createElement('p', null,
            'Retrieve all available skills:'
          ),
          React.createElement('div', { className: 'code-block', style: { marginTop: '8px', marginBottom: '12px' } },
            React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
              'curl https://aegis-skills.vercel.app/api/skills'
            )
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'GET /api/[skill]/manifest'),
          React.createElement('p', null,
            'Fetch the full manifest for a skill, including phases and input/output schema:'
          ),
          React.createElement('div', { className: 'code-block', style: { marginTop: '8px', marginBottom: '12px' } },
            React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
              'curl https://aegis-skills.vercel.app/api/mitre-attack/manifest'
            )
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'POST /api/[skill]/invoke'),
          React.createElement('p', null,
            'Execute a skill with your input:'
          ),
          React.createElement('div', { className: 'code-block', style: { marginTop: '8px', marginBottom: '12px' } },
            React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
              `curl -X POST https://aegis-skills.vercel.app/api/mitre-attack/invoke \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Lateral movement techniques in enterprise networks"}'`
            )
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'GET /api/[skill]/phase/[phaseId]'),
          React.createElement('p', null,
            'Fetch raw phase content (used internally by Themis):'
          ),
          React.createElement('div', { className: 'code-block', style: { marginTop: '8px', marginBottom: '12px' } },
            React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)' } },
              'curl https://aegis-skills.vercel.app/api/mitre-attack/phase/reconnaissance'
            )
          )
        ),

        // ── Using Themis ──
        React.createElement('section', { className: 'doc-section', id: 'themis' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '04'),
            React.createElement('h2', null, 'Multi-Agent Analysis with Themis')
          ),
          React.createElement('p', null,
            'Themis orchestrates skills for complex threat analysis. Instead of invoking a single skill, submit a task and Themis decomposes it into sub-tasks, invokes multiple skills in parallel, validates outputs, and synthesises a findings report.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--cream)' } }, 'Submit a Task'),
          React.createElement('div', { className: 'code-block', style: { marginTop: '8px', marginBottom: '12px' } },
            React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)', whiteSpace: 'pre-wrap' } },
              `curl -X POST https://aegis-skills.vercel.app/api/themis \\
  -H "Content-Type: application/json" \\
  -d '{
    "task": "Assess attack surface for a hybrid cloud environment",
    "context": {
      "environments": ["enterprise", "cloud"],
      "attackSurfaceTags": ["network", "lateral-movement"]
    }
  }'`
            )
          ),
          React.createElement('p', null,
            'The response includes the findings report, skills invoked, guardrail verdicts, token usage, and a thread ID for session continuity.'
          ),
          React.createElement('p', null,
            'For full details on Themis architecture, see the ',
            React.createElement('a', { href: '/themis', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'Themis page'),
            '.'
          )
        ),

        // ── Audit API ──
        React.createElement('section', { className: 'doc-section', id: 'audit' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '05'),
            React.createElement('h2', null, 'Standards-Based Security Audit')
          ),
          React.createElement('p', null,
            'The Audit API runs a structured compliance audit against one or more security standards. Supported standards: CIS L1/L2, NIST CSF, ISO 27001, SOC 2, PCI-DSS, HIPAA, IEC 62443, NIST 800-53.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--cream)' } }, 'POST /api/audit'),
          React.createElement('p', null, 'Submit a configuration, policy document, or architecture description for audit:'),
          React.createElement('div', { className: 'code-block', style: { marginTop: '8px', marginBottom: '12px' } },
            React.createElement('div', { className: 'code-body', style: { fontSize: '11px', fontFamily: 'var(--f-mono)', padding: '8px', color: 'var(--cream-dim)', whiteSpace: 'pre-wrap' } },
              `curl -X POST https://aegis-skills.vercel.app/api/audit \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": "<config or policy text>",
    "inputType": "config",
    "standards": ["cis-l1", "nist-csf"]
  }'`
            )
          ),
          React.createElement('p', null, 'Request fields:'),
          React.createElement(
            'ul',
            { style: { color: 'var(--cream-dim)', fontSize: '13px', marginLeft: '20px', marginTop: '8px' } },
            React.createElement('li', null, React.createElement('code', null, 'input'), ' — the configuration or policy text to audit (required)'),
            React.createElement('li', null, React.createElement('code', null, 'inputType'), ' — one of: config, policy, architecture, description (optional, defaults to description)'),
            React.createElement('li', null, React.createElement('code', null, 'standards'), ' — array of standard slugs to apply (optional, auto-detected from input if omitted)')
          ),
          React.createElement('p', { style: { marginTop: '12px' } }, 'The response includes executiveSummary, findings (per control), summary (severity counts), standardsApplied, skillTrace, and durationMs.')
        ),

        // ── Troubleshooting ──
        React.createElement('section', { className: 'doc-section', id: 'troubleshooting' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '06'),
            React.createElement('h2', null, 'Troubleshooting')
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: Skill returns 404'),
          React.createElement('p', null,
            'The skill name does not exist or is misspelled. Call GET /api/skills to see all available skill names.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: Invoke returns 400 (Bad Request)'),
          React.createElement('p', null,
            'Your input does not match the skill schema. Fetch the manifest with GET /api/[skill]/manifest to see required fields and types.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: Invoke times out (>30s)'),
          React.createElement('p', null,
            'The skill took longer than expected. This is normal for LLM-based skills. Timeout limits vary — see your deployment documentation.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: Themis returns a sanitized error'),
          React.createElement('p', null,
            'Themis hides internal details for security. Your input may violate guardrails, or a skill invocation may have failed. Check that your task and context are valid.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: How do I use the system prompt?'),
          React.createElement('p', null,
            'Click on a skill to view its page. The system prompt is available in an InstallTabs section. Copy it and paste into your LLM interface, or use it to build a custom agent.'
          ),

          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--gold)' } }, 'Q: What is the health score?'),
          React.createElement('p', null,
            'A 0-100 rating based on phase coverage, tag completeness, framework linkage, and freshness. Higher scores indicate more developed and well-maintained skills.'
          )
        ),

        // ── Security ──
        React.createElement('section', { className: 'doc-section', id: 'security' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '07'),
            React.createElement('h2', null, 'Security & Privacy')
          ),
          React.createElement('p', null,
            'Aegis and Themis follow strict security principles:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '12px', marginBottom: '12px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              'All LLM provider SDKs run server-side only. No API keys are exposed to the client.'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              'Logs contain only metadata (hashes, token counts, durations) — never task or response content.'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              'Client errors are sanitized through a fixed error handler — no stack traces, internal paths, or model names reach the client.'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              'Findings and task content are never persisted to disk, database, or external storage — only in-memory during execution.'
            ),
            React.createElement('li', null,
              'All skill phase content is validated against content integrity patterns (script injection, eval, data URIs) before reaching agents.'
            )
          )
        ),

        // ── Next Steps ──
        React.createElement('section', { className: 'doc-section' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '08'),
            React.createElement('h2', null, 'Next Steps')
          ),
          React.createElement('p', null,
            'Ready to use Aegis? Start with the ',
            React.createElement('a', { href: '/', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'Skills marketplace'),
            '. For advanced orchestration, explore the ',
            React.createElement('a', { href: '/themis', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'Themis documentation'),
            '. For complete technical details, see ',
            React.createElement('a', { href: 'https://github.com/drupadsachania/aegis-skills/blob/main/docs/TECHNICAL.md', target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'TECHNICAL.md'),
            ' in the repository.'
          )
        )
      )
    )
  )
}
