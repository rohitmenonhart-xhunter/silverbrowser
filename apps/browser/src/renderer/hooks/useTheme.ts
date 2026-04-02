import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Load saved preference
    window.silver?.settings?.get('general.theme').then((saved: unknown) => {
      if (saved === 'light' || saved === 'dark') {
        applyTheme(saved as Theme)
      } else if (saved === 'system') {
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        applyTheme(sys)
      }
    }).catch(() => {})

    // Listen for system changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      window.silver?.settings?.get('general.theme').then((saved: unknown) => {
        if (saved === 'system') {
          applyTheme(e.matches ? 'dark' : 'light')
        }
      }).catch(() => {})
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function applyTheme(t: Theme) {
    setTheme(t)
    document.documentElement.dataset.theme = t
  }

  // Listen for theme sync from other views (via main process)
  useEffect(() => {
    const handler = (e: Event) => {
      const t = (e as CustomEvent).detail as Theme
      if (t === 'dark' || t === 'light') applyTheme(t)
    }
    window.addEventListener('silver:theme-sync', handler)
    return () => window.removeEventListener('silver:theme-sync', handler)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    window.silver?.settings?.set('general.theme', next)
    // Broadcast to other views
    window.silver?.ui?.broadcastTheme?.(next)
  }

  return { theme, toggleTheme }
}
