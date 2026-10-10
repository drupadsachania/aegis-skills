import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { UI_CSP } from './security'
import { sendText } from './respond'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

export function serveStatic(req: IncomingMessage, res: ServerResponse, uiDir: string, pathname: string): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method not allowed')
  const root = path.resolve(uiDir)
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    return sendText(res, 503, 'Dashboard UI is not built. Run: npm run build -w @aegis-skills/themis')
  }
  let rel: string
  try { rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '') } catch { return sendText(res, 400, 'Bad path') }
  const abs = path.resolve(root, rel)
  if (rel.includes('\0') || !abs.startsWith(root + path.sep)) return sendText(res, 404, 'Not found')
  const type = TYPES[path.extname(abs).toLowerCase()]
  if (!type || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return sendText(res, 404, 'Not found')
  const body = fs.readFileSync(abs)
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': String(body.length),
    'Content-Security-Policy': UI_CSP,
    'Cache-Control': rel === 'index.html' ? 'no-store' : 'public, max-age=31536000, immutable',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}
