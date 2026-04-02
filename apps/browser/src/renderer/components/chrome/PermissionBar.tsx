import { useState, useEffect } from 'react'

interface PermissionRequest {
  id: number
  permission: string
}

const PERMISSION_LABELS: Record<string, string> = {
  geolocation: 'Location',
  'media-video': 'Camera',
  'media-audio': 'Microphone',
  notifications: 'Notifications',
  midi: 'MIDI',
  'idle-detection': 'Idle Detection',
}

const PermissionIcon = ({ permission }: { permission: string }) => {
  if (permission === 'geolocation') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
  if (permission.includes('video') || permission.includes('camera')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/>
      <rect x="2" y="7" width="14" height="10" rx="2"/>
    </svg>
  )
  if (permission.includes('audio') || permission.includes('mic')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  )
  if (permission === 'notifications') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  )
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  )
}

export function PermissionBar() {
  const [request, setRequest] = useState<PermissionRequest | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      setRequest((e as CustomEvent).detail)
    }
    window.addEventListener('silver:permission-request', handler)
    return () => window.removeEventListener('silver:permission-request', handler)
  }, [])

  if (!request) return null

  const label = PERMISSION_LABELS[request.permission] || request.permission

  const respond = (allowed: boolean) => {
    (window.silver as any).ui.permissionResponse(request.id, allowed)
    setRequest(null)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 44,
      left: 8,
      right: 8,
      zIndex: 500,
      padding: '10px 12px',
      background: 'var(--sv-bg-raised)',
      border: '1px solid var(--sv-border-default)',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      animation: 'sv-fade-in 200ms ease',
      boxShadow: 'var(--sv-shadow-lg)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'var(--sv-accent-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--sv-accent-bright)',
        flexShrink: 0,
      }}>
        <PermissionIcon permission={request.permission} />
      </div>

      <div style={{ flex: 1, fontSize: 12, color: 'var(--sv-text-primary)', fontWeight: 500 }}>
        This site wants to use your <strong>{label}</strong>
      </div>

      <button
        onClick={() => respond(false)}
        style={{
          height: 28, padding: '0 14px',
          background: 'var(--sv-bg-active)',
          color: 'var(--sv-text-secondary)',
          border: '1px solid var(--sv-border-default)',
          borderRadius: 7, fontSize: 11, fontWeight: 600,
          cursor: 'pointer',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--sv-bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--sv-bg-active)'}
      >Block</button>

      <button
        onClick={() => respond(true)}
        style={{
          height: 28, padding: '0 14px',
          background: 'var(--sv-accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 7, fontSize: 11, fontWeight: 600,
          cursor: 'pointer',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >Allow</button>
    </div>
  )
}
