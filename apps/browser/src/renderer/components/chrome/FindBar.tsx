import { useState, useEffect, useRef } from 'react'

export function FindBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }
    window.addEventListener('silver:find-in-page', handler)
    return () => window.removeEventListener('silver:find-in-page', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', top: 60, right: 20, zIndex: 400,
      background: 'var(--sv-glass-bg)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--sv-glass-border)',
      borderRadius: 'var(--sv-radius-lg)',
      padding: '6px 8px', display: 'flex', gap: 6,
      alignItems: 'center',
      boxShadow: 'var(--sv-shadow-lg)',
      animation: 'sv-fade-in 150ms ease',
    }}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find in page"
        spellCheck={false}
        style={{
          width: 220, height: 28, padding: '0 10px',
          background: 'var(--sv-bg-raised)', border: '1px solid var(--sv-border-default)',
          borderRadius: 'var(--sv-radius-md)',
          color: 'var(--sv-text-primary)', fontSize: 12,
          fontFamily: 'var(--sv-font-sans)', outline: 'none',
        }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
      />
      <button onClick={() => { setOpen(false); setQuery('') }} style={{
        background: 'none', border: 'none', color: 'var(--sv-text-tertiary)',
        cursor: 'pointer', fontSize: 14, padding: '2px 4px',
        display: 'flex', alignItems: 'center',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
