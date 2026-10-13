'use strict'

const React = require('react')

const h = React.createElement

// Data-flow diagram for /trust. Inline SVG, coloured only through CSS classes that read the design
// tokens (see ".fd-*" in styles/globals.css), so it follows the light and dark themes.
// Two layouts share one description: a wide one (>= 761px) and a stacked one for phones (viewBox
// 360 wide, drawn 1:1 at 390px so 13px text stays 13px). The numbered list below the figure is the
// full text alternative; both SVGs also carry <title>/<desc>.
//
// Not colour alone: arrows that cross the network are solid, arrows that stay on your machine are
// dashed, and every arrow has a number that the list explains.

const EDGES = [
  { n: 1, where: 'Our site to you', text: 'Download: prompts and skill zips are static files. Nothing you paste or ask is sent back.' },
  { n: 2, where: 'Hosted MCP', text: 'Your AI client sends a tool name and arguments; our read-only function returns public skill text.' },
  { n: 3, where: 'Your AI client to its provider', text: 'Your chat goes to the provider of the AI you chose, as it always does. Themis plugin mode adds no model call.' },
  { n: 4, where: 'Plugin, local', text: 'Your AI client talks to the Themis plugin over stdio on your machine.' },
  { n: 5, where: 'Themis to your MCP servers', text: 'Governed tool calls go only to MCP servers you configured. Writes and executes wait for your approval first.' },
  { n: 6, where: 'Standalone to your model', text: 'The standalone app sends its prompts to the model provider you chose, or to a local model.' },
  { n: 7, where: 'Themis storage, local', text: 'Runs, approvals, audit log, reports and keys are written under ~/.themis.' },
  { n: 8, where: 'Aegis skills, local', text: 'Skill files are plain markdown read from your machine.' }
]

const TITLE = 'Where data goes in Aegis and Themis'
const DESC = 'Three zones. Our site serves static downloads and a read-only hosted MCP. Your machine holds your AI client, Themis, its local storage and the Aegis skill files. Services you chose are your model provider and the MCP servers you configured. Eight numbered arrows are explained in the list below the figure.'

// text lines inside a box, centred
function lines (cx, y0, list, cls) {
  return list.map((t, i) => h('text', { key: i, x: cx, y: y0 + i * 17, textAnchor: 'middle', className: i === 0 ? 'fd-head' : (cls || 'fd-text') }, t))
}

function Node ({ x, y, w, hgt, kind, list }) {
  const top = y + 24
  return h('g', null,
    h('rect', { x, y, width: w, height: hgt, rx: 12, className: `fd-node fd-${kind}` }),
    ...lines(x + w / 2, top, list))
}

function Zone ({ x, y, w, hgt, title, anchor }) {
  return h('g', null,
    h('rect', { x, y, width: w, height: hgt, rx: 20, className: 'fd-zone' }),
    h('text', { x: anchor === 'middle' ? x + w / 2 : x + 16, y: y + 24, textAnchor: anchor === 'middle' ? 'middle' : 'start', className: 'fd-zone-title' }, title))
}

// numbered marker on an arrow
function Marker ({ n, x, y }) {
  return h('g', null,
    h('circle', { cx: x, cy: y, r: 12, className: 'fd-badge' }),
    h('text', { x, y: y + 4.5, textAnchor: 'middle', className: 'fd-badge-text' }, String(n)))
}

function Edge ({ pts, local, both, id, n, at }) {
  return h('g', null,
    h('polyline', {
      points: pts.map(p => p.join(',')).join(' '), fill: 'none',
      className: local ? 'fd-edge fd-local' : 'fd-edge fd-net',
      markerEnd: `url(#${id})`, markerStart: both ? `url(#${id})` : undefined
    }),
    h(Marker, { n, x: at[0], y: at[1] }))
}

function Defs ({ id }) {
  return h('defs', null,
    h('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      h('path', { d: 'M1 1 L9 5 L1 9 z', className: 'fd-arrow' })))
}

function Wide () {
  const id = 'fd-arrow-wide'
  return h('svg', { className: 'fd-svg fd-wide', viewBox: '0 0 760 470', role: 'img', 'aria-labelledby': 'fd-t-wide fd-d-wide', focusable: 'false' },
    h('title', { id: 'fd-t-wide' }, TITLE),
    h('desc', { id: 'fd-d-wide' }, DESC),
    h(Defs, { id }),
    h(Zone, { x: 10, y: 10, w: 180, hgt: 380, title: 'OUR SITE' }),
    h(Zone, { x: 250, y: 10, w: 270, hgt: 380, title: 'YOUR MACHINE' }),
    h(Zone, { x: 580, y: 10, w: 170, hgt: 380, title: 'YOUR CHOICES' }),
    h(Node, { x: 24, y: 58, w: 152, hgt: 74, kind: 'aegis', list: ['Prompts, zips', 'static files'] }),
    h(Node, { x: 24, y: 190, w: 152, hgt: 92, kind: 'aegis', list: ['Hosted MCP', '/api/mcp', 'read-only'] }),
    h(Node, { x: 266, y: 58, w: 238, hgt: 74, kind: 'plain', list: ['Your AI client or chat', 'Claude Code, Codex, Gemini CLI'] }),
    h(Node, { x: 266, y: 170, w: 238, hgt: 74, kind: 'themis', list: ['Themis', 'plugin or app on 127.0.0.1'] }),
    h(Node, { x: 266, y: 290, w: 112, hgt: 88, kind: 'plain', list: ['~/.themis', 'runs, audit,', 'keys (0600)'] }),
    h(Node, { x: 392, y: 290, w: 112, hgt: 88, kind: 'aegis', list: ['Aegis skills', 'markdown', 'files'] }),
    h(Node, { x: 594, y: 58, w: 142, hgt: 92, kind: 'plain', list: ['Model provider', 'or a local model', 'your choice'] }),
    h(Node, { x: 594, y: 190, w: 142, hgt: 92, kind: 'plain', list: ['MCP servers', 'you configured', 'yours'] }),
    h(Edge, { id, n: 1, pts: [[176, 95], [266, 95]], at: [221, 95] }),
    h(Edge, { id, n: 2, both: true, pts: [[176, 236], [220, 236], [220, 118], [266, 118]], at: [220, 177] }),
    h(Edge, { id, n: 3, pts: [[504, 90], [594, 90]], at: [549, 90] }),
    h(Edge, { id, n: 4, local: true, both: true, pts: [[385, 132], [385, 170]], at: [385, 151] }),
    h(Edge, { id, n: 5, pts: [[504, 236], [594, 236]], at: [549, 236] }),
    h(Edge, { id, n: 6, pts: [[504, 190], [550, 190], [550, 128], [594, 128]], at: [550, 160] }),
    h(Edge, { id, n: 7, local: true, both: true, pts: [[322, 244], [322, 290]], at: [322, 267] }),
    h(Edge, { id, n: 8, local: true, pts: [[448, 290], [448, 244]], at: [448, 267] }),
    h('line', { x1: 14, y1: 420, x2: 58, y2: 420, className: 'fd-edge fd-net' }),
    h('text', { x: 66, y: 425, className: 'fd-text' }, 'solid: can cross the network'),
    h('line', { x1: 14, y1: 446, x2: 58, y2: 446, className: 'fd-edge fd-local' }),
    h('text', { x: 66, y: 451, className: 'fd-text' }, 'dashed: stays on your machine'))
}

function Narrow () {
  const id = 'fd-arrow-narrow'
  return h('svg', { className: 'fd-svg fd-narrow', viewBox: '0 0 360 810', role: 'img', 'aria-labelledby': 'fd-t-narrow fd-d-narrow', focusable: 'false' },
    h('title', { id: 'fd-t-narrow' }, TITLE),
    h('desc', { id: 'fd-d-narrow' }, DESC),
    h(Defs, { id }),
    h(Zone, { x: 6, y: 6, w: 348, hgt: 124, title: 'OUR SITE', anchor: 'middle' }),
    h(Node, { x: 16, y: 38, w: 160, hgt: 82, kind: 'aegis', list: ['Prompts, zips', 'static files'] }),
    h(Node, { x: 184, y: 38, w: 160, hgt: 82, kind: 'aegis', list: ['Hosted MCP', 'read-only'] }),
    h(Zone, { x: 6, y: 170, w: 348, hgt: 394, title: 'YOUR MACHINE', anchor: 'middle' }),
    h(Node, { x: 16, y: 210, w: 276, hgt: 74, kind: 'plain', list: ['Your AI client or chat', 'Claude Code, Codex, Gemini CLI'] }),
    h(Node, { x: 16, y: 330, w: 276, hgt: 74, kind: 'themis', list: ['Themis', 'plugin or app on 127.0.0.1'] }),
    h(Node, { x: 16, y: 446, w: 136, hgt: 100, kind: 'plain', list: ['~/.themis', 'runs, audit,', 'keys (0600)'] }),
    h(Node, { x: 160, y: 446, w: 132, hgt: 100, kind: 'aegis', list: ['Aegis skills', 'markdown files'] }),
    h(Zone, { x: 6, y: 626, w: 348, hgt: 126, title: 'SERVICES YOU CHOSE', anchor: 'middle' }),
    h(Node, { x: 16, y: 660, w: 160, hgt: 82, kind: 'plain', list: ['MCP servers', 'you configured'] }),
    h(Node, { x: 184, y: 660, w: 160, hgt: 82, kind: 'plain', list: ['Model provider', 'or a local model'] }),
    h(Edge, { id, n: 1, pts: [[60, 120], [60, 210]], at: [60, 160] }),
    h(Edge, { id, n: 2, both: true, pts: [[250, 120], [250, 210]], at: [250, 160] }),
    h(Edge, { id, n: 4, local: true, both: true, pts: [[154, 284], [154, 330]], at: [154, 307] }),
    h(Edge, { id, n: 7, local: true, both: true, pts: [[84, 404], [84, 446]], at: [84, 425] }),
    h(Edge, { id, n: 8, local: true, pts: [[226, 446], [226, 404]], at: [226, 425] }),
    h(Edge, { id, n: 3, pts: [[292, 247], [344, 247], [344, 616], [300, 616], [300, 660]], at: [344, 440] }),
    h(Edge, { id, n: 6, pts: [[292, 367], [328, 367], [328, 604], [264, 604], [264, 660]], at: [328, 500] }),
    h(Edge, { id, n: 5, pts: [[292, 391], [312, 391], [312, 590], [96, 590], [96, 660]], at: [312, 560] }),
    h('line', { x1: 14, y1: 774, x2: 50, y2: 774, className: 'fd-edge fd-net' }),
    h('text', { x: 58, y: 779, className: 'fd-text' }, 'solid: can cross the network'),
    h('line', { x1: 14, y1: 796, x2: 50, y2: 796, className: 'fd-edge fd-local' }),
    h('text', { x: 58, y: 801, className: 'fd-text' }, 'dashed: stays on your machine'))
}

function FlowDiagram () {
  return h('figure', { className: 'fd-figure' },
    h(Wide),
    h(Narrow),
    h('figcaption', null,
      h('p', { className: 'fd-cap-title' }, 'What each arrow means'),
      h('ol', { className: 'fd-list' },
        ...EDGES.map(e => h('li', { key: e.n, value: e.n }, h('strong', null, `${e.where}. `), e.text)))))
}

module.exports = FlowDiagram
module.exports.default = FlowDiagram
module.exports.EDGES = EDGES
