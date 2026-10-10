import http from 'node:http'

export interface Resp { status: number; headers: http.IncomingHttpHeaders; text: string; json: any } // eslint-disable-line @typescript-eslint/no-explicit-any
export interface ReqOpts { headers?: Record<string, string>; body?: unknown; rawBody?: string }

/** node:http so every header (Host, Origin, Cookie) is under test control. */
export function request(port: number, method: string, path: string, o: ReqOpts = {}): Promise<Resp> {
  const payload = o.rawBody ?? (o.body === undefined ? undefined : JSON.stringify(o.body))
  const headers: Record<string, string> = { Host: `127.0.0.1:${port}`, ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}), ...o.headers }
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let json: unknown = null
        try { json = JSON.parse(text) } catch { /* not json */ }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json })
      })
    })
    req.on('error', reject)
    if (payload !== undefined) req.write(payload)
    req.end()
  })
}

export function authed(port: number, token: string, extra: Record<string, string> = {}): Record<string, string> {
  return { Cookie: `themis_session_${port}=${token}`, Origin: `http://127.0.0.1:${port}`, 'Sec-Fetch-Site': 'same-origin', ...extra }
}
