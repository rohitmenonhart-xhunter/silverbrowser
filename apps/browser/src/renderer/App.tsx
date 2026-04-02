import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { FindBar } from './components/chrome/FindBar'
import { PermissionBar } from './components/chrome/PermissionBar'
import { GhostPanel } from './components/ghost/GhostPanel'
import { Onboarding } from './components/onboarding/Onboarding'
import { useTabStore } from './stores/tab-store'
import { useTheme } from './hooks/useTheme'

function parseColor(color: string): [number, number, number] | null {
  if (!color) return null
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]]
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i)
  if (hexMatch) return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)]
  return null
}

function toSidebarColor(r: number, g: number, b: number, light: boolean): string {
  const max = Math.max(r, g, b, 1)
  if (light) {
    const nr = Math.round(230 + (r / max) * 20)
    const ng = Math.round(228 + (g / max) * 20)
    const nb = Math.round(225 + (b / max) * 20)
    return `rgb(${Math.min(nr, 248)}, ${Math.min(ng, 246)}, ${Math.min(nb, 244)})`
  }
  const scale = 0.12
  const nr = Math.round((r / max) * 255 * scale + 10)
  const ng = Math.round((g / max) * 255 * scale + 10)
  const nb = Math.round((b / max) * 255 * scale + 10)
  return `rgb(${Math.min(nr, 45)}, ${Math.min(ng, 45)}, ${Math.min(nb, 45)})`
}

// Sidebar toggle icon
const SidebarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
  </svg>
)

// Ghost-only mode: when loaded with #ghost hash, render only the panel
const isGhostView = window.location.hash === '#ghost'

export function App() {
  if (isGhostView) return <GhostApp />

  const setTabs = useTabStore((s) => s.setTabs)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarBg, setSidebarBg] = useState('var(--sv-bg-base)')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { theme } = useTheme()

  // Check if onboarding needed
  useEffect(() => {
    window.silver.settings.get('onboarding.complete').then((done: any) => {
      if (!done) setShowOnboarding(true)
    }).catch(() => setShowOnboarding(true))
  }, [])

  useEffect(() => {
    const unsubscribe = window.silver.tabs.onUpdate(setTabs)
    window.silver.tabs.list().then(setTabs)
    return unsubscribe
  }, [setTabs])

  // Reset colors when theme changes
  useEffect(() => {
    setSidebarBg('var(--sv-bg-base)')
  }, [theme])

  // Sidebar state from main process
  useEffect(() => {
    const handler = (e: Event) => setSidebarOpen((e as CustomEvent).detail)
    window.addEventListener('silver:sidebar-state', handler)
    return () => window.removeEventListener('silver:sidebar-state', handler)
  }, [])

  // Adaptive accent color
  useEffect(() => {
    const handler = (e: Event) => {
      const rgb = parseColor((e as CustomEvent).detail)
      if (rgb) {
        const [r, g, b] = rgb
        const isLight = document.documentElement.dataset.theme === 'light'
        setSidebarBg(toSidebarColor(r, g, b, isLight))
      }
    }
    window.addEventListener('silver:accent-color', handler)
    return () => window.removeEventListener('silver:accent-color', handler)
  }, [])

  const toggleSidebar = useCallback(() => {
    try { (window as any).silver?.ui?.sidebar() } catch {}
  }, [])

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'transparent',
      display: 'flex',
    }}>
      {/* Sidebar or collapsed toggle strip */}
      <div style={{ height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {sidebarOpen ? (
          <Sidebar accentBg={sidebarBg} />
        ) : (
          <div style={{
            width: 48, height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 44,
            background: 'var(--sv-bg-base)',
          }}>
            <button
              onClick={toggleSidebar}
              title="Show sidebar"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--sv-bg-raised)',
                border: '1px solid var(--sv-border-subtle)',
                color: 'var(--sv-text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sv-bg-hover)'; e.currentTarget.style.color = 'var(--sv-text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--sv-bg-raised)'; e.currentTarget.style.color = 'var(--sv-text-secondary)' }}
            >
              <SidebarIcon />
            </button>
          </div>
        )}
      </div>

      <FindBar />
      <PermissionBar />
    </div>
  )
}

// Dedicated Ghost view — always-open panel, no sidebar
function GhostApp() {
  useTheme() // sync theme with settings + listen for broadcasts
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--sv-bg-base)' }}>
      <GhostPanel alwaysOpen />
    </div>
  )
}
