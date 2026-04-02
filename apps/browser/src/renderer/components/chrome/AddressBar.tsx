import { useState, useEffect, useRef } from 'react'
import { useTabStore } from '../../stores/tab-store'
import { useGhostStore } from '../../stores/ghost-store'

// SVG Icons (Lucide-style, stroke-based)
const BackIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
const ForwardIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
const ReloadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
const LockIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--sv-success)" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const StarOutline = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const StarFilled = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--sv-warning)" stroke="var(--sv-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const GhostIcon = ({ size = 14 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8v10l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5L20 20V10a8 8 0 0 0-8-8z"/><circle cx="9.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="11" r="1" fill="currentColor" stroke="none"/></svg>
const ShieldIcon = ({ on = false }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={on ? 'var(--sv-success)' : 'none'} stroke={on ? 'var(--sv-success)' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const PuzzleIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>
const DownloadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const SettingsIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>

export function AddressBar() {
  const tabs = useTabStore((s) => s.tabs)
  const activeId = useTabStore((s) => s.activeId)
  const navigateTab = useTabStore((s) => s.navigateTab)
  const goBack = useTabStore((s) => s.goBack)
  const goForward = useTabStore((s) => s.goForward)
  const reload = useTabStore((s) => s.reload)
  const toggleGhost = useGhostStore((s) => s.toggle)

  const activeTab = tabs.find((t) => t.id === activeId)
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkUrls, setBookmarkUrls] = useState<Set<string>>(new Set())
  const [shieldOn, setShieldOn] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load bookmarks + shield state
  useEffect(() => {
    window.silver.import.getData().then((data: any) => {
      setBookmarkUrls(new Set((data.bookmarks || []).map((b: any) => b.url)))
    }).catch(() => {})
    window.silver?.shield?.status().then((s: any) => setShieldOn(s?.enabled || false)).catch(() => {})
    const handler = (e: any) => setShieldOn(e.detail)
    window.addEventListener('silver:shield-changed', handler)
    return () => window.removeEventListener('silver:shield-changed', handler)
  }, [])

  useEffect(() => {
    if (!focused && activeTab) setInput(activeTab.url === 'about:blank' ? '' : activeTab.url)
    setIsBookmarked(activeTab?.url ? bookmarkUrls.has(activeTab.url) : false)
  }, [activeTab?.url, focused, bookmarkUrls])

  const toggleBookmark = async () => {
    if (!activeTab) return
    const data = await window.silver.import.getData() as any
    const bookmarks = data.bookmarks || []
    if (isBookmarked) {
      await window.silver.settings.set('imported.bookmarks', bookmarks.filter((b: any) => b.url !== activeTab.url))
      bookmarkUrls.delete(activeTab.url)
    } else {
      bookmarks.unshift({ title: activeTab.title, url: activeTab.url, folder: 'Bookmarks' })
      await window.silver.settings.set('imported.bookmarks', bookmarks)
      bookmarkUrls.add(activeTab.url)
    }
    setBookmarkUrls(new Set(bookmarkUrls))
    setIsBookmarked(!isBookmarked)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeId && input.trim()) { navigateTab(activeId, input.trim()); inputRef.current?.blur() }
  }

  useEffect(() => {
    const handler = () => { inputRef.current?.focus(); inputRef.current?.select() }
    window.addEventListener('silver:focus-addressbar', handler)
    return () => window.removeEventListener('silver:focus-addressbar', handler)
  }, [])

  return (
    <div style={{
      height: 42, display: 'flex', alignItems: 'center', gap: 6,
      paddingLeft: 10, paddingRight: 10,
      background: 'var(--sv-bg-raised)', flexShrink: 0,
      borderBottom: '1px solid var(--sv-border-subtle)',
    }}>
      <NavBtn onClick={goBack} disabled={!activeTab?.canGoBack} title="Back"><BackIcon /></NavBtn>
      <NavBtn onClick={goForward} disabled={!activeTab?.canGoForward} title="Forward"><ForwardIcon /></NavBtn>
      <NavBtn onClick={reload} title="Reload"><ReloadIcon /></NavBtn>

      {/* URL Capsule */}
      <form onSubmit={handleSubmit} style={{ flex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', width: '100%', height: 30,
          background: 'var(--sv-bg-raised)',
          border: focused ? '1px solid var(--sv-accent)' : '1px solid var(--sv-border-subtle)',
          borderRadius: 'var(--sv-radius-lg)',
          boxShadow: focused ? '0 0 0 3px var(--sv-accent-muted)' : 'none',
          transition: 'border-color 200ms, box-shadow 200ms',
          overflow: 'hidden',
        }}>
          {activeTab?.url?.startsWith('https://') && !focused && (
            <div style={{ paddingLeft: 10, display: 'flex', alignItems: 'center', flexShrink: 0 }}><LockIcon /></div>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => { setFocused(true); e.target.select() }}
            onBlur={() => setFocused(false)}
            placeholder="Search or enter URL"
            spellCheck={false}
            style={{
              flex: 1, height: '100%', padding: '0 10px',
              background: 'transparent', border: 'none',
              color: 'var(--sv-text-primary)', fontSize: 12.5,
              fontFamily: 'var(--sv-font-sans)',
              outline: 'none',
            }}
          />
          {activeTab?.url && !activeTab.url.startsWith('file://') && activeTab.url !== 'about:blank' && (
            <button
              onClick={(e) => { e.preventDefault(); toggleBookmark() }}
              title="Bookmark"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 8px', display: 'flex', alignItems: 'center',
                color: 'var(--sv-text-tertiary)', flexShrink: 0,
              }}
            >
              {isBookmarked ? <StarFilled /> : <StarOutline />}
            </button>
          )}
        </div>
      </form>

      {/* Toolbar icons — all SVG, no emojis */}
      <NavBtn onClick={() => window.silver.shield.menu()} title={shieldOn ? 'Shield On' : 'Shield Off'}>
        <ShieldIcon on={shieldOn} />
      </NavBtn>
      <NavBtn onClick={toggleGhost} title="Ghost (Cmd+K)"><GhostIcon /></NavBtn>
      <NavBtn onClick={() => window.silver.extensions.menu()} title="Extensions"><PuzzleIcon /></NavBtn>
      <NavBtn onClick={() => window.silver.actions.downloadsMenu()} title="Downloads"><DownloadIcon /></NavBtn>
      <NavBtn onClick={() => window.silver.actions.settingsMenu()} title="Settings"><SettingsIcon /></NavBtn>
    </div>
  )
}

function NavBtn({ children, onClick, disabled, title }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      background: 'none', border: 'none',
      color: disabled ? 'var(--sv-text-ghost)' : 'var(--sv-text-secondary)',
      cursor: disabled ? 'default' : 'pointer',
      width: 28, height: 28, borderRadius: 'var(--sv-radius-md)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      transition: 'all 120ms',
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = 'var(--sv-bg-hover)'; e.currentTarget.style.color = 'var(--sv-text-primary)' } }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = disabled ? 'var(--sv-text-ghost)' : 'var(--sv-text-secondary)' }}
    >{children}</button>
  )
}
