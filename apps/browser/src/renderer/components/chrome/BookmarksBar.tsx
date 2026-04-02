import { useState, useEffect } from 'react'
import { useTabStore } from '../../stores/tab-store'

interface Bookmark { title: string; url: string }

export function BookmarksBar() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const activeId = useTabStore((s) => s.activeId)
  const navigateTab = useTabStore((s) => s.navigateTab)

  useEffect(() => {
    window.silver.import.getData().then((data: any) => {
      if (data.bookmarks?.length > 0) setBookmarks(data.bookmarks)
    }).catch(() => {})
  }, [])

  if (bookmarks.length === 0) return null

  return (
    <div style={{
      height: 30, display: 'flex', alignItems: 'center', gap: 4,
      paddingLeft: 8, paddingRight: 8, overflow: 'hidden',
      background: 'var(--sv-bg-base)', flexShrink: 0,
      borderTop: '1px solid var(--sv-border-subtle)',
    }}>
      {bookmarks.slice(0, 20).map((bm, i) => {
        let domain = ''
        try { domain = new URL(bm.url).hostname } catch {}
        return (
          <button
            key={i}
            onClick={() => activeId && navigateTab(activeId, bm.url)}
            title={bm.url}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 24, padding: '0 10px',
              borderRadius: 'var(--sv-radius-full)',
              background: 'var(--sv-bg-overlay)',
              border: '1px solid var(--sv-border-subtle)',
              color: 'var(--sv-text-secondary)', fontSize: 11, fontWeight: 500,
              fontFamily: 'var(--sv-font-sans)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 120ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--sv-bg-hover)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = 'var(--sv-shadow-sm)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--sv-bg-overlay)'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
              width={12} height={12} style={{ borderRadius: 2 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span>{bm.title ? bm.title.slice(0, 18) : domain}</span>
          </button>
        )
      })}
    </div>
  )
}
