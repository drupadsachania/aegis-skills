// Status chip: colour AND label AND glyph (DESIGN 8.9), so state never relies on colour alone.
type Tone = 'info' | 'neutral' | 'warn' | 'ok' | 'bad'

const LABELS: Record<string, string> = { awaiting_approval: 'Needs approval', needs_reproposal: 'Re-propose', not_executed: 'Not run', not_run: 'Not run' }
const GLYPHS: Record<string, string> = {
  pending: '○', awaiting_approval: '❚❚', needs_reproposal: '↻', stale: '↻', approved: '✓', completed: '✓', executed: '✓', supported: '✓',
  rejected: '✕', unsupported: '✕', failed: '▲', not_executed: '–', not_run: '–', missing: '–', optional: '–', expired: '–',
  write: '✎', execute: '›_', unknown: '?', set: '●',
}
const TONES: Record<string, Tone> = {
  running: 'info', pending: 'neutral', supported: 'info', set: 'info',
  awaiting_approval: 'warn', needs_reproposal: 'warn', stale: 'warn', unknown: 'warn', execute: 'warn',
  completed: 'ok', approved: 'ok', executed: 'ok',
  failed: 'bad', rejected: 'bad', write: 'bad', unsupported: 'bad',
}

const human = (v: string): string => { const s = v.replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1) }

export function StatusBadge({ value }: { value: string }) {
  const tone = TONES[value] ?? 'neutral'
  return (
    <span className={`badge badge-${value} tone-${tone}`}>
      {value === 'running' ? <span className="k-spin" aria-hidden="true" /> : <span className="glyph" aria-hidden="true">{GLYPHS[value] ?? '•'}</span>}
      {LABELS[value] ?? human(value)}
    </span>
  )
}
