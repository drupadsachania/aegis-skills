import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RunEvents, StampedEvent } from '../runner/events'
import { API_CSP } from './respond'

/** Streams a run's events: history first, then live, until the run ends or the client leaves. */
export function streamRun(req: IncomingMessage, res: ServerResponse, events: RunEvents, runId: string, isLive: () => boolean): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'Content-Security-Policy': API_CSP,
  })
  const send = (e: StampedEvent): void => { res.write(`event: run\ndata: ${JSON.stringify(e)}\n\n`) }
  const end = (): void => { res.write('event: end\ndata: {}\n\n'); cleanup(); res.end() }
  for (const e of events.history(runId)) send(e)
  if (!isLive()) { end(); return }
  const unsubscribe = events.subscribe(runId, (e) => {
    send(e)
    if (e.event.type === 'status' && e.event.status !== 'running') setImmediate(() => { if (!isLive()) end() })
  })
  const ping = setInterval(() => res.write(': ping\n\n'), 15000)
  function cleanup(): void { clearInterval(ping); unsubscribe() }
  req.on('close', cleanup)
}
