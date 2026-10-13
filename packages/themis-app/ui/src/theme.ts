import { useCallback, useState } from 'react'

const KEY = 'themis-theme'
export type Theme = 'light' | 'dark'

/** Light is the default; dark only when chosen with the toggle. The OS setting is never read. */
export const currentTheme = (): Theme => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')

function apply(next: Theme): void {
  document.documentElement.setAttribute('data-theme', next)
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', next)
  try { window.localStorage.setItem(KEY, next) } catch { /* storage unavailable */ }
}

type VT = Document & { startViewTransition?: (cb: () => void) => unknown }

export function setTheme(next: Theme): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const doc = document as VT
  if (!reduce && typeof doc.startViewTransition === 'function') { doc.startViewTransition(() => apply(next)); return }
  if (!reduce) {
    const root = document.documentElement
    root.classList.add('k-theme-anim')
    apply(next)
    window.setTimeout(() => root.classList.remove('k-theme-anim'), 400)
    return
  }
  apply(next)
}

export function useTheme(): [Theme, () => void] {
  const [theme, set] = useState<Theme>(currentTheme)
  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    setTheme(next)
    set(next)
  }, [])
  return [theme, toggle]
}
