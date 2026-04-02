import { useState, useRef, useEffect } from 'react'
import { useTabStore } from '../../stores/tab-store'
// Ghost toggle goes through IPC — main process tracks state
import { useTheme } from '../../hooks/useTheme'

// SVG Icons
const BackIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
const ForwardIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
const ReloadIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
const LinkIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const GhostIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8v10l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5L20 20V10a8 8 0 0 0-8-8z"/><circle cx="9.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="11" r="1" fill="currentColor" stroke="none"/></svg>
const SettingsIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const SunIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
const MoonIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
const CloseIcon = () => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

export function Sidebar({ accentBg }: { accentBg?: string }) {
  const tabs = useTabStore((s) => s.tabs)
  const activeId = useTabStore((s) => s.activeId)
  const switchTab = useTabStore((s) => s.switchTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const createTab = useTabStore((s) => s.createTab)
  const navigateTab = useTabStore((s) => s.navigateTab)
  const goBack = useTabStore((s) => s.goBack)
  const goForward = useTabStore((s) => s.goForward)
  const reload = useTabStore((s) => s.reload)
  // Toggle ghost — main process tracks the open/close state
  const toggleGhost = () => (window.silver as any).ghost.togglePanel()
  const { theme, toggleTheme } = useTheme()

  const activeTab = tabs.find((t) => t.id === activeId)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Array<{title: string; url: string}>>([])
  const [urlFocused, setUrlFocused] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.silver.import.getData().then((d: any) => {
      if (d.bookmarks?.length > 0) setBookmarks(d.bookmarks.slice(0, 6))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!urlFocused && activeTab) {
      setUrlInput(activeTab.url === 'about:blank' ? '' : activeTab.url)
    }
  }, [activeTab?.url, urlFocused])

  useEffect(() => {
    const handler = () => { urlRef.current?.focus(); urlRef.current?.select() }
    window.addEventListener('silver:focus-addressbar', handler)
    return () => window.removeEventListener('silver:focus-addressbar', handler)
  }, [])

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeId && urlInput.trim()) { navigateTab(activeId, urlInput.trim()); urlRef.current?.blur() }
  }

  // Get display URL (just hostname)
  let displayUrl = ''
  try { displayUrl = activeTab?.url ? new URL(activeTab.url).hostname.replace('www.', '') : '' } catch {}

  return (
    <div style={{
      width: 260, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: accentBg || 'var(--sv-bg-base)',
      transition: 'background 800ms ease',
      flexShrink: 0,
    }}>
      {/* Top area: traffic lights + nav + url */}
      <div style={{
        padding: '14px 12px 8px',
        WebkitAppRegion: 'drag' as any,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {/* Nav row — traffic lights take ~68px, toggle after them */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          WebkitAppRegion: 'no-drag' as any,
        }}>
          {/* Spacer for traffic lights */}
          <div style={{ width: 62, flexShrink: 0 }} />
          <SideBtn onClick={() => { try { (window as any).silver?.ui?.sidebar() } catch {} }} title="Hide sidebar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </SideBtn>
          <div style={{ flex: 1 }} />
          <SideBtn onClick={goBack} disabled={!activeTab?.canGoBack}><BackIcon /></SideBtn>
          <SideBtn onClick={goForward} disabled={!activeTab?.canGoForward}><ForwardIcon /></SideBtn>
          <SideBtn onClick={reload}><ReloadIcon /></SideBtn>
        </div>

        {/* URL bar */}
        <form onSubmit={handleUrlSubmit} style={{ WebkitAppRegion: 'no-drag' as any }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 34, padding: '0 12px',
            background: 'var(--sv-bg-raised)',
            border: urlFocused ? '1px solid var(--sv-accent)' : '1px solid var(--sv-border-subtle)',
            borderRadius: 'var(--sv-radius-lg)',
            boxShadow: urlFocused ? '0 0 0 3px var(--sv-accent-muted)' : 'none',
            transition: 'all 200ms',
          }}>
            <LinkIcon />
            <input
              ref={urlRef}
              value={urlFocused ? urlInput : displayUrl}
              onChange={(e) => setUrlInput(e.target.value)}
              onFocus={(e) => { setUrlFocused(true); setUrlInput(activeTab?.url || ''); setTimeout(() => e.target.select(), 0) }}
              onBlur={() => setUrlFocused(false)}
              placeholder="Search or enter URL"
              spellCheck={false}
              style={{
                flex: 1, height: '100%', background: 'transparent', border: 'none',
                color: 'var(--sv-text-primary)', fontSize: 12, fontFamily: 'var(--sv-font-sans)',
                outline: 'none',
              }}
            />
          </div>
        </form>
      </div>

      {/* Pinned apps (bookmarks as icons) */}
      {bookmarks.length > 0 && (
        <div style={{
          display: 'flex', gap: 4, padding: '4px 12px 8px',
          flexWrap: 'wrap',
        }}>
          {bookmarks.map((bm, i) => {
            let domain = ''
            try { domain = new URL(bm.url).hostname } catch {}
            return (
              <button key={i}
                onClick={() => activeId && navigateTab(activeId, bm.url)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (confirm(`Remove ${bm.title || domain} from pinned?`)) {
                    const updated = bookmarks.filter((_, idx) => idx !== i)
                    setBookmarks(updated)
                    window.silver.settings.set('imported.bookmarks', updated)
                  }
                }}
                title={bm.title || domain}
                style={{
                  width: 36, height: 36, borderRadius: 'var(--sv-radius-lg)',
                  background: 'var(--sv-bg-raised)', border: '1px solid var(--sv-border-subtle)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 120ms', overflow: 'hidden', padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--sv-border-strong)'; e.currentTarget.style.transform = 'scale(1.05)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--sv-border-subtle)'; e.currentTarget.style.transform = 'none' }}
              >
                <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  width={18} height={18} style={{ borderRadius: 2 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Section label */}
      <div style={{
        padding: '8px 16px 4px', fontSize: 10.5, fontWeight: 600,
        color: 'var(--sv-text-tertiary)', letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Tabs
      </div>

      {/* Tab list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeId
          const isHovered = hoveredTab === tab.id
          let domain = ''
          try { domain = new URL(tab.url).hostname.replace('www.', '') } catch {}
          return (
            <div
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 36, padding: '0 10px',
                borderRadius: 'var(--sv-radius-lg)',
                background: isActive ? 'var(--sv-bg-raised)' : (isHovered ? 'var(--sv-bg-hover)' : 'transparent'),
                cursor: 'pointer',
                transition: 'all 150ms cubic-bezier(0.25, 0.1, 0.25, 1)',
                border: isActive ? '1px solid var(--sv-border-default)' : '1px solid transparent',
                boxShadow: isActive ? 'var(--sv-shadow-sm)' : 'none',
                marginBottom: 2,
              }}
            >
              {/* Favicon */}
              {tab.loading ? (
                <div style={{
                  width: 14, height: 14, border: '2px solid var(--sv-accent)',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'sv-spin 0.6s linear infinite', flexShrink: 0,
                }} />
              ) : tab.favicon ? (
                <img src={tab.favicon} width={14} height={14}
                  style={{ borderRadius: 3, flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--sv-bg-active)', flexShrink: 0 }} />
              )}

              {/* Title */}
              <span style={{
                fontSize: 12.5, fontWeight: isActive ? 500 : 400,
                color: isActive ? 'var(--sv-text-primary)' : 'var(--sv-text-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                flex: 1, minWidth: 0,
              }}>
                {tab.title || domain || 'New Tab'}
              </span>

              {/* Close — always in DOM, opacity toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                style={{
                  background: 'none', border: 'none', color: 'var(--sv-text-tertiary)',
                  cursor: 'pointer', padding: 0, borderRadius: 4,
                  width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'opacity 80ms, background 80ms',
                  opacity: (isActive || isHovered) ? 0.8 : 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sv-bg-active)'; e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              >
                  <CloseIcon />
              </button>
            </div>
          )
        })}
      </div>

      {/* Bottom bar: new tab + ghost + settings */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '8px 12px',
        borderTop: '1px solid var(--sv-border-subtle)',
      }}>
        <SideBtn onClick={() => createTab()} title="New Tab"><PlusIcon /></SideBtn>
        <SideBtn onClick={async () => {
          const r = await (window.silver as any).google.signIn()
          if (r?.success) alert('Signed in to Google! (' + r.cookies + ' cookies imported)')
        }} title="Sign in to Google">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        </SideBtn>
        <div style={{ flex: 1 }} />
        <SideBtn onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </SideBtn>
        <SideBtn onClick={toggleGhost} title="Ghost Agent"><GhostIcon /></SideBtn>
        <SideBtn onClick={() => window.silver.actions.settingsMenu()} title="Settings"><SettingsIcon /></SideBtn>
      </div>
    </div>
  )
}

function SideBtn({ children, onClick, disabled, title }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      background: 'none', border: 'none',
      color: disabled ? 'var(--sv-text-ghost)' : 'var(--sv-text-secondary)',
      cursor: disabled ? 'default' : 'pointer',
      width: 28, height: 28, borderRadius: 'var(--sv-radius-md)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: 'all 100ms',
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = 'var(--sv-bg-hover)'; e.currentTarget.style.color = 'var(--sv-text-primary)' } }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = disabled ? 'var(--sv-text-ghost)' : 'var(--sv-text-secondary)' }}
    >{children}</button>
  )
}
