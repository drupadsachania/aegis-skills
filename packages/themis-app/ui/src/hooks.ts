import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from './api'

export const errMsg = (e: unknown): string => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e))

/** GET a path, expose loading/error and a reload function. Optional polling interval in ms. */
export function useLoad<T>(path: string | null, pollMs = 0) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(path !== null)
  const reload = useCallback(() => {
    if (path === null) return Promise.resolve()
    return api.get<T>(path).then((d) => { setData(d); setError(null) }).catch((e) => setError(errMsg(e))).finally(() => setLoading(false))
  }, [path])
  useEffect(() => {
    setLoading(path !== null)
    void reload()
    if (!pollMs) return undefined
    const t = setInterval(() => { void reload() }, pollMs)
    return () => clearInterval(t)
  }, [reload, pollMs, path])
  return { data, error, loading, reload, setError }
}

export const shortId = (id: string): string => id.slice(0, 8)
export const when = (iso: string | null): string => (iso ? new Date(iso).toLocaleString() : '-')
