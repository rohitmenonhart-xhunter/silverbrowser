import { useState, useRef } from 'react'
import { useTabStore } from '../../stores/tab-store'

const IncognitoIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
    <path d="M2 12h4l1.5-3h9L18 12h4"/><circle cx="7" cy="15" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10 15h4"/>
  </svg>
)

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs)
  const activeId = useTabStore((s) => s.activeId)
  const switchTab = useTabStore((s) => s.switchTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const createTab = useTabStore((s) => s.createTab)

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const dragRef = useRef<number | null>(null)

  return (
    <div style={{
      height: 40, display: 'flex', alignItems: 'flex-end', gap: 1,
      paddingLeft: 8, paddingRight: 8, paddingBottom: 0,
      background: 'var(--sv-bg-base)', flexShrink: 0, overflow: 'hidden',
    }}>
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeId
        const isHovered = hoveredTab === tab.id
        return (
          <div
            key={tab.id}
            draggable
            onDragStart={() => { dragRef.current = idx; setDragIdx(idx) }}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(idx) }}
            onDrop={() => {
              if (dragRef.current !== null && dragRef.current !== idx) window.silver.tabs.reorder(dragRef.current, idx)
              setDragIdx(null); setOverIdx(null); dragRef.current = null
            }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); dragRef.current = null }}
            onClick={() => switchTab(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              height: isActive ? 34 : 30,
              padding: '0 12px',
              borderRadius: isActive ? '10px 10px 0 0' : '8px 8px 0 0',
              background: isActive
                ? (tab.incognito ? 'var(--sv-incognito)' : 'var(--sv-bg-raised)')
                : (isHovered ? 'var(--sv-bg-hover)' : 'transparent'),
              cursor: 'grab',
              maxWidth: 220, minWidth: 0,
              transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              borderTop: isActive ? '2px solid var(--sv-accent)' : '2px solid transparent',
              borderLeft: isActive ? '1px solid var(--sv-border-default)' : '1px solid transparent',
              borderRight: isActive ? '1px solid var(--sv-border-default)' : '1px solid transparent',
              opacity: dragIdx === idx ? 0.4 : 1,
              transform: overIdx === idx && dragIdx !== idx ? 'translateX(4px)' : 'none',
              marginBottom: isActive ? -1 : 2,
              position: 'relative',
            }}
          >
            {/* Favicon / Loading / Incognito */}
            {tab.loading ? (
              <div style={{
                width: 10, height: 10,
                border: '2px solid var(--sv-accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'sv-spin 0.6s linear infinite',
                flexShrink: 0,
              }} />
            ) : tab.incognito ? (
              <IncognitoIcon />
            ) : tab.favicon ? (
              <img src={tab.favicon} width={14} height={14}
                style={{ borderRadius: 3, flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                background: 'var(--sv-bg-active)',
              }} />
            )}

            {/* Title */}
            <span style={{
              fontSize: 12, fontWeight: isActive ? 500 : 400,
              color: isActive ? 'var(--sv-text-primary)' : 'var(--sv-text-tertiary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              flex: 1, minWidth: 0,
              transition: 'color 150ms',
            }}>
              {tab.title || 'New Tab'}
            </span>

            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              style={{
                background: 'none', border: 'none',
                color: 'var(--sv-text-tertiary)', cursor: 'pointer',
                padding: 0, borderRadius: 4,
                flexShrink: 0, width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: (isActive || isHovered) ? 0.8 : 0,
                transition: 'opacity 120ms, background 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sv-bg-active)'; e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )
      })}

      {/* New tab */}
      <button
        onClick={() => createTab()}
        style={{
          background: 'none', border: 'none',
          color: 'var(--sv-text-tertiary)', cursor: 'pointer',
          width: 30, height: 30, borderRadius: '8px 8px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 120ms',
          marginBottom: 2,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sv-bg-hover)'; e.currentTarget.style.color = 'var(--sv-text-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--sv-text-tertiary)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  )
}
