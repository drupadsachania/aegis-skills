'use strict'

const React = require('react')
const Head = require('next/head').default
const Layout = require('../components/Layout')

module.exports = function ThemisPage() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Head,
      null,
      React.createElement('title', null, 'Themis — Threat Analysis Orchestrator')
    ),
    React.createElement(
      Layout,
      null,
      React.createElement('div', { style: { position: 'relative', zIndex: 1, paddingTop: '80px' } },
        // ── Doc meta ──
        React.createElement('div', { className: 'doc-meta' },
          React.createElement('span', { className: 'dot' }),
          React.createElement('span', null, 'ORCHESTRATION ENGINE'),
          React.createElement('span', { className: 'sep' })
        ),

        // ── Title & intro ──
        React.createElement('h1', { className: 'doc-title' }, 'Themis'),
        React.createElement('p', { className: 'doc-subtitle' }, 'LangGraph-powered multi-agent threat analysis'),
        React.createElement('p', { className: 'doc-intro' },
          'An AI-driven threat analysis orchestrator that decomposes security tasks into specialist sub-tasks, executes them in parallel via Aegis skills, applies guardrails to every output, and synthesises a structured findings report. All processing is memory-ephemeral—no findings or task content persists to disk.'
        ),

        // ── Architecture ──
        React.createElement('section', { className: 'doc-section', id: 'architecture' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '01'),
            React.createElement('h2', null, 'Architecture')
          ),
          React.createElement('p', null,
            'Themis is a LangGraph StateGraph with six nodes wired as a directed acyclic graph:'
          ),
          React.createElement('div', { className: 'code-block', style: { marginTop: '20px', marginBottom: '20px' } },
            React.createElement('div', { className: 'code-body', style: { fontSize: '12px', fontFamily: 'var(--f-mono)', padding: '16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } },
              `specNode
   │
fanOutNode  ── Send() ──▶ skillAgentNode (×N, parallel)
                            │
                       guardrailNode
                            │
                       synthesisNode
                            │
                        auditNode`
            )
          ),
          React.createElement('p', null,
            'Fan-out uses the LangGraph Send API — fanOutNode returns one Send per sub-task, and LangGraph executes them in parallel on separate graph branches.'
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '24px', marginBottom: '12px', color: 'var(--cream)' } }, 'Node Responsibilities'),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '12px', marginBottom: '20px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'specNode'),
              ' — Parse task + context, emit sub-tasks for specialist agents'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'fanOutNode'),
              ' — Return Send[] for parallel dispatch'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'skillAgentNode'),
              ' — Run createReactAgent for one sub-task; call skill phase fetch tool'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'guardrailNode'),
              ' — Score each output; block/flag/pass based on content integrity'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('strong', null, 'synthesisNode'),
              ' — Reduce guardrailed results into structured report'
            ),
            React.createElement('li', null,
              React.createElement('strong', null, 'auditNode'),
              ' — Write metadata-only debrief to SQLite; strip findings'
            )
          )
        ),

        // ── State Management ──
        React.createElement('section', { className: 'doc-section', id: 'state' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '02'),
            React.createElement('h2', null, 'State & Checkpointing')
          ),
          React.createElement('p', null,
            'State is held in ThemisAnnotation (14 channels) using typed reducers:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '12px', marginBottom: '20px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'append'),
              ' — Accumulates sub-task results and guardrail outputs'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'sum'),
              ' — Token counters (aggregate input/output tokens)'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'last-write-wins'),
              ' — Final report and thread metadata'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'dedup-union'),
              ' — Skill slug sets (avoid duplicates)'
            ),
            React.createElement('li', null,
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'first-write-wins'),
              ' — Task and context (set once, never mutated)'
            )
          ),
          React.createElement('p', null,
            'Checkpointing uses MemorySaver — state is in-RAM only, scoped to a thread_id. No external database, no network calls for checkpointing.'
          )
        ),

        // ── Providers ──
        React.createElement('section', { className: 'doc-section', id: 'providers' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '03'),
            React.createElement('h2', null, 'LLM Providers')
          ),
          React.createElement('p', null,
            'Themis supports multiple LLM providers with tiered model selection (fast/standard/power). Provider selection is determined at runtime based on available API keys:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '16px', marginBottom: '20px' } },
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Anthropic'),
              ' — Set ',
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'ANTHROPIC_API_KEY'),
              ' (Claude models)'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'OpenAI'),
              ' — Set ',
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'OPENAI_API_KEY'),
              ' (GPT-4, GPT-5 models)'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Google'),
              ' — Set ',
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'GOOGLE_API_KEY'),
              ' (Gemini models)'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Mistral'),
              ' — Set ',
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'MISTRAL_API_KEY'),
              ' (Mistral models)'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'DeepSeek'),
              ' — Set ',
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'DEEPSEEK_API_KEY'),
              ' (DeepSeek models)'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Qwen'),
              ' — Set ',
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'QWEN_API_KEY'),
              ' (Qwen models)'
            ),
            React.createElement('li', null,
              React.createElement('strong', null, 'NVIDIA'),
              ' — Set ',
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'NVIDIA_API_KEY'),
              ' (Nemotron models)'
            )
          ),
          React.createElement('p', null,
            'All LLM provider SDKs are restricted to lib/themis/provider.ts. No provider SDK may be imported elsewhere. This is enforced at the bundle level. For detailed model specifications, see the technical documentation.'
          )
        ),

        // ── Security Model ──
        React.createElement('section', { className: 'doc-section', id: 'security' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '04'),
            React.createElement('h2', null, 'Security Model')
          ),
          React.createElement('p', null,
            'Themis treats all inputs as untrusted and enforces five core security principles:'
          ),
          React.createElement('ol', { style: { marginLeft: '20px', marginTop: '16px', marginBottom: '20px' } },
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Every input is untrusted'),
              ' — Task content, LLM outputs, skill phase content are all treated as potentially adversarial'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Sanitise before log'),
              ' — Loggers receive only metadata (hashes, token counts, durations). No user input or LLM output reaches a log line'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Sanitise before client'),
              ' — All errors pass through safeError() which returns one of three fixed strings. No stack traces, paths, or model names reach the client'
            ),
            React.createElement('li', { style: { marginBottom: '12px' } },
              React.createElement('strong', null, 'Memory ephemeral'),
              ' — No findings or task content is persisted to Redis, Supabase, or any external storage'
            ),
            React.createElement('li', null,
              React.createElement('strong', null, 'Content integrity checks'),
              ' — All skill phase content is validated against blocked-content patterns (script injection, eval, data URIs) before reaching agents'
            )
          )
        ),

        // ── API ──
        React.createElement('section', { className: 'doc-section', id: 'api' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '05'),
            React.createElement('h2', null, 'POST /api/themis')
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '16px', marginBottom: '12px', color: 'var(--cream)' } }, 'Request'),
          React.createElement('div', { className: 'code-block' },
            React.createElement('div', { className: 'code-body', style: { fontSize: '12px', fontFamily: 'var(--f-mono)', padding: '12px', color: 'var(--cream-dim)' } },
              JSON.stringify({
                task: 'Assess the attack surface for a hybrid cloud + OT environment',
                context: {
                  environments: ['enterprise', 'hybrid', 'ot'],
                  attackSurfaceTags: ['network', 'lateral-movement']
                },
                threadId: 'optional-session-id'
              }, null, 2)
            )
          ),
          React.createElement('h3', { style: { fontSize: '16px', marginTop: '20px', marginBottom: '12px', color: 'var(--cream)' } }, 'Response'),
          React.createElement('div', { className: 'code-block' },
            React.createElement('div', { className: 'code-body', style: { fontSize: '12px', fontFamily: 'var(--f-mono)', padding: '12px', color: 'var(--cream-dim)', maxHeight: '300px', overflowY: 'auto' } },
              JSON.stringify({
                report: '## Findings\n...',
                subTaskResults: [],
                guardrailSummary: { passed: 3, flagged: 0, blocked: 0 },
                skillTrace: ['mitre-attack', 'deception-engineering'],
                totalInputTokens: 12400,
                totalOutputTokens: 3200,
                durationMs: 8400,
                threadId: 'abc-123'
              }, null, 2)
            )
          ),
          React.createElement('p', { style: { marginTop: '16px' } },
            'Supports streaming: pass ',
            React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'Accept: text/event-stream'),
            ' to receive node-name events as the graph executes. Node content and findings are never included in SSE events.'
          )
        ),

        // ── Audit ──
        React.createElement('section', { className: 'doc-section', id: 'audit' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '06'),
            React.createElement('h2', null, 'Debrief & Audit Trail')
          ),
          React.createElement('p', null,
            'Each orchestration writes a metadata-only row to a local SQLite database:'
          ),
          React.createElement('ul', { style: { marginLeft: '20px', marginTop: '16px', marginBottom: '20px' } },
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'thread_id'),
              ' — Session correlation ID'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'task_hash'),
              ' — SHA-256 of the task string (not the task itself)'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'skill_slugs'),
              ' — JSON array of skills invoked'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'guardrail_summary'),
              ' — { passed, flagged, blocked }'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'total_input_tokens'),
              ' — Aggregated input token count'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'total_output_tokens'),
              ' — Aggregated output token count'
            ),
            React.createElement('li', { style: { marginBottom: '8px' } },
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'duration_ms'),
              ' — Wall-clock duration'
            ),
            React.createElement('li', null,
              React.createElement('code', { style: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px' } }, 'created_at'),
              ' — UTC timestamp'
            )
          ),
          React.createElement('p', null,
            'Findings text and task content are never written to SQLite. The audit trail captures only what is necessary for operational visibility and compliance.'
          )
        ),

        // ── More info ──
        React.createElement('section', { className: 'doc-section' },
          React.createElement('div', { className: 'doc-section-hd' },
            React.createElement('span', { className: 'ds-num' }, '07'),
            React.createElement('h2', null, 'Next Steps')
          ),
          React.createElement('p', null,
            'See the ',
            React.createElement('a', { href: '/docs', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'Documentation'),
            ' page for getting started guides and API reference. For the complete technical specification, see ',
            React.createElement('a', { href: 'https://github.com/drupadsachania/aegis-skills/blob/main/docs/TECHNICAL.md', target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--accent)', textDecoration: 'underline' } }, 'TECHNICAL.md'),
            ' in the repository.'
          )
        )
      )
    )
  )
}
