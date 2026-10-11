'use strict'

const React = require('react')

const h = React.createElement

// One worked example of how the two products divide the work. The task and the tool name are
// illustrative; the skill names (exposure-validation, threat-modeling) are real Aegis skills, and
// every step describes behaviour that the Themis code enforces (see /docs/themis/governance).
const TASK = 'Assess exposure of CVE-2026-12345 on web-01'

const STEPS = [
  { who: 'You', tone: 'you', title: 'You ask',
    text: `"${TASK}." A plain-language task, typed in your AI client or the Themis dashboard.` },
  { who: 'Themis + Aegis', tone: 'both', title: 'Themis plans, Aegis supplies the method',
    text: 'Themis splits the task into sub-tasks and picks specialist skills, here exposure-validation and threat-modeling. Aegis supplies each skill\'s methodology: the phases the agent follows.' },
  { who: 'Themis', tone: 'themis', title: 'A write-capable call is proposed',
    text: 'Following the method, the agent proposes an active check against web-01 through a tool you connected. Themis classifies it as write or execute and records an approval request. It does not run.' },
  { who: 'You', tone: 'you', title: 'A person decides',
    text: 'You approve or decline on the dashboard\'s Approvals page, or in your client\'s own prompt. Only an approved request runs, once. A declined one is never executed.' },
  { who: 'Themis + Aegis', tone: 'both', title: 'The report is stamped',
    text: 'The report records the Themis, Aegis and osk versions it was produced with, the guardrail results and each proposed action with its outcome.' }
]

function AegisThemisFlow () {
  return h('section', { className: 'flow', 'aria-labelledby': 'flow-title' },
    h('div', { className: 'flow-head', 'data-reveal': '' },
      h('h3', { id: 'flow-title' }, 'One task, two roles'),
      h('p', null, h('strong', null, 'Aegis provides the specialist skill. Themis governs how an agent invokes it and what it can do with the result.'),
        ' Illustrative task, real skill names:')),
    h('ol', { className: 'flow-steps' },
      ...STEPS.map((s, i) => h('li', { key: s.title, className: `flow-step tone-${s.tone}`, 'data-reveal': '' },
        h('span', { className: 'flow-n', 'aria-hidden': 'true' }, String(i + 1)),
        h('span', { className: 'flow-who' }, s.who),
        h('h4', null, s.title),
        h('p', null, s.text)))),
    h('p', { className: 'flow-note' }, 'The CVE number and the tool are examples. See ', h('a', { href: '/docs/themis/governance' }, 'governance'), ' for the rules Themis enforces.'))
}

module.exports = AegisThemisFlow
module.exports.default = AegisThemisFlow
module.exports.STEPS = STEPS
module.exports.TASK = TASK
