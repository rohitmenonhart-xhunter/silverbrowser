import { useState, useEffect, useRef } from 'react'
import { useTabStore } from '../../stores/tab-store'
import { useGhostStore } from '../../stores/ghost-store'

export function SettingsMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeId = useTabStore((s) => s.activeId)
  const navigateTab = useTabStore((s) => s.navigateTab)
  const createTab = useTabStore((s) => s.createTab)
  const toggleGhost = useGhostStore((s) => s.toggle)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    setTimeout(() => document.addEventListener('click', handler), 0)
    return () => document.removeEventListener('click', handler)
  }, [open, onClose])

  // Close on escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const menuItem = (label: string, shortcut: string, onClick: () => void) => (
    <div
      onClick={() => { onClick(); onClose() }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 14px', cursor: 'pointer', fontSize: 12,
        color: '#d0d1d6', transition: 'background 80ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span>{label}</span>
      {shortcut && <span style={{ color: '#5a5d66', fontSize: 10 }}>{shortcut}</span>}
    </div>
  )

  const separator = () => (
    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
  )

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: 70,
        right: 8,
        width: 220,
        background: '#232328',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '6px 0',
        zIndex: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {menuItem('New Tab', '⌘T', () => createTab())}
      {menuItem('New Window', '⌘N', () => window.silver.actions.newWindow())}
      {separator()}
      {menuItem('Find in Page', '⌘F', () => window.silver.actions.find())}
      {menuItem('Print', '⌘P', () => window.silver.actions.print())}
      {separator()}
      {menuItem('Zoom In', '⌘+', () => window.silver.actions.zoomIn())}
      {menuItem('Zoom Out', '⌘-', () => window.silver.actions.zoomOut())}
      {menuItem('Reset Zoom', '⌘0', () => window.silver.actions.zoomReset())}
      {separator()}
      {menuItem('Ghost Agent', '⌘K', () => toggleGhost())}
      {menuItem('Developer Tools', '⌘⌥I', () => window.silver.actions.devtools())}
      {menuItem('Full Screen', '⌘⇧F', () => window.silver.actions.fullscreen())}
      {separator()}

      {/* All Settings — opens full page */}
      <div
        onClick={() => {
          if (activeId) navigateTab(activeId, 'silver://settings')
          onClose()
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', cursor: 'pointer', fontSize: 12,
          color: '#c0c4ce', fontWeight: 500, transition: 'background 80ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        All Settings...
      </div>
    </div>
  )
}
