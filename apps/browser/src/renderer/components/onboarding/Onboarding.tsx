'use client'
import { useState, useCallback } from 'react'

// --- Ghost Logo (app icon) ---
const GhostLogo = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <rect width="120" height="120" rx="28" fill="var(--sv-text-primary)"/>
    <g transform="translate(24, 16)">
      <path d="M36 8C19.4 8 6 21.4 6 38v42l10.5-10.5 7 10.5 10.5-10.5 10.5 10.5 10.5-10.5 7 10.5L72 80V38C72 21.4 58.6 8 42 8z"
        stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9"/>
      <circle cx="30" cy="36" r="3" fill="white" opacity="0.9"/>
      <circle cx="48" cy="36" r="3" fill="white" opacity="0.9"/>
    </g>
  </svg>
)

// --- Icons ---
const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
)

const BotIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8"/><rect x="2" y="8" width="20" height="14" rx="2"/>
    <path d="M7 15h0M17 15h0"/>
  </svg>
)

const ZapIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </svg>
)

const LayoutIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
  </svg>
)

const LockIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const KeyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.3 9.3M18 5l3 3"/>
  </svg>
)

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
)

// --- Slide data ---
interface Slide {
  title: string
  subtitle: string
  icon: React.ReactNode
  features?: { label: string; desc: string }[]
  setup?: boolean
}

const slides: Slide[] = [
  {
    title: 'Welcome to Silver',
    subtitle: 'The open-source browser with a brain. Built for people who want more from their browser — and less tracking.',
    icon: <GhostLogo size={72} />,
  },
  {
    title: 'Ghost AI Agent',
    subtitle: 'Ghost lives inside Silver. It browses, researches, writes, and executes tasks autonomously — right in your browser.',
    icon: <BotIcon />,
    features: [
      { label: 'Chat mode', desc: 'Talk with any webpage. Ghost reads the page and answers questions.' },
      { label: 'Agent mode', desc: 'Describe a task. Ghost plans, browses, runs commands, spawns sub-agents.' },
      { label: 'Per-task workspace', desc: 'Every task gets its own folder with plans, notes, and results.' },
    ],
  },
  {
    title: 'Privacy First',
    subtitle: 'Silver never phones home. No telemetry, no tracking, no data collection. Your browsing is yours.',
    icon: <ShieldIcon />,
    features: [
      { label: 'Silver Shield', desc: 'Cloudflare DNS-over-HTTPS. Your ISP sees nothing.' },
      { label: 'Ad Blocker', desc: 'Engine-level YouTube ad skip. 31+ blocked domains.' },
      { label: 'Anti-fingerprinting', desc: 'Stealth mode spoofs browser identity to protect you.' },
    ],
  },
  {
    title: 'Encrypted Vault',
    subtitle: 'Your passwords and files, encrypted with AES-256-GCM. Protected by Touch ID or PIN. Zero-knowledge.',
    icon: <LockIcon />,
    features: [
      { label: 'Password manager', desc: 'Auto-save and auto-fill. Encrypted at rest.' },
      { label: 'Safe folder', desc: 'Store sensitive files in an invisible encrypted vault.' },
      { label: 'Touch ID + PIN', desc: 'Biometric or PIN to access. No master password to forget.' },
    ],
  },
  {
    title: 'Modern Browser',
    subtitle: 'Arc-style sidebar, vertical tabs, split view, reader mode, keyboard shortcuts — everything you need.',
    icon: <LayoutIcon />,
    features: [
      { label: 'Sidebar tabs', desc: 'Vertical tabs with adaptive page-color tinting.' },
      { label: 'Split view', desc: 'Two tabs side by side. Cmd+Shift+S to toggle.' },
      { label: 'DRM support', desc: 'Netflix, Disney+, Hotstar — all work out of the box.' },
    ],
  },
  {
    title: 'Set Up Ghost',
    subtitle: 'Ghost uses OpenRouter for AI. Add your free API key to get started, or skip and set it up later.',
    icon: <KeyIcon />,
    setup: true,
  },
]

// --- Main Component ---

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const slide = slides[step]
  const isLast = step === slides.length - 1

  const next = useCallback(() => {
    if (isLast) {
      if (apiKey.trim()) {
        window.silver.settings.set('ghost.apiKey', apiKey.trim())
      }
      window.silver.settings.set('onboarding.complete', true)
      onComplete()
    } else {
      setStep(s => s + 1)
    }
  }, [step, isLast, apiKey, onComplete])

  const skip = useCallback(() => {
    window.silver.settings.set('onboarding.complete', true)
    onComplete()
  }, [onComplete])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--sv-bg-base)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--sv-font-sans)',
      overflow: 'hidden',
    }}>
      {/* Skip button */}
      {!isLast && (
        <button onClick={skip} style={{
          position: 'absolute', top: 16, right: 20, zIndex: 10,
          background: 'none', border: 'none', fontSize: 12, fontWeight: 500,
          color: 'var(--sv-text-tertiary)', cursor: 'pointer',
          padding: '6px 12px', borderRadius: 8,
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--sv-text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--sv-text-tertiary)'}
        >Skip</button>
      )}

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        maxWidth: 520, margin: '0 auto', width: '100%',
      }}>
        {/* Icon */}
        <div style={{
          marginBottom: 28,
          color: 'var(--sv-text-primary)',
          opacity: step === 0 ? 1 : undefined,
        }}>
          {step === 0 ? slide.icon : (
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--sv-accent-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--sv-accent-bright)',
            }}>
              {slide.icon}
            </div>
          )}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: step === 0 ? 32 : 26, fontWeight: 700,
          color: 'var(--sv-text-primary)',
          textAlign: 'center', letterSpacing: '-0.02em',
          marginBottom: 10, lineHeight: 1.2,
        }}>{slide.title}</h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 14, color: 'var(--sv-text-secondary)',
          textAlign: 'center', lineHeight: 1.7,
          maxWidth: 400, marginBottom: 28,
        }}>{slide.subtitle}</p>

        {/* Features list */}
        {slide.features && (
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column',
            gap: 8, marginBottom: 8,
          }}>
            {slide.features.map(f => (
              <div key={f.label} style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'var(--sv-bg-raised)',
                border: '1px solid var(--sv-border-subtle)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--sv-accent)', marginTop: 6, flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sv-text-primary)', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--sv-text-tertiary)', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Setup: API key input */}
        {slide.setup && (
          <div style={{ width: '100%', marginBottom: 8 }}>
            <div style={{
              padding: 14, borderRadius: 12,
              background: 'var(--sv-bg-raised)',
              border: '1px solid var(--sv-border-subtle)',
            }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--sv-text-tertiary)', display: 'block', marginBottom: 6 }}>
                OpenRouter API Key
              </label>
              <input
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                type="password"
                style={{
                  width: '100%', height: 38, padding: '0 12px',
                  background: 'var(--sv-bg-overlay)',
                  border: '1px solid var(--sv-border-default)',
                  borderRadius: 8, color: 'var(--sv-text-primary)',
                  fontSize: 12, fontFamily: 'var(--sv-font-mono)',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--sv-text-ghost)', marginTop: 8, lineHeight: 1.5 }}>
                Get a free key at <span style={{ color: 'var(--sv-accent-bright)', fontWeight: 500 }}>openrouter.ai/keys</span>
                <br />You can also set this later in Ghost settings.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '16px 32px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, flexShrink: 0,
      }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'center' }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6,
              borderRadius: 3,
              background: i === step ? 'var(--sv-text-primary)' : 'var(--sv-border-default)',
              transition: 'all 300ms ease',
              cursor: 'pointer',
            }} onClick={() => setStep(i)} />
          ))}
        </div>

        {/* Next / Get Started button */}
        <button onClick={next} style={{
          height: 40, padding: '0 24px',
          background: 'var(--sv-text-primary)',
          color: 'var(--sv-bg-base)',
          border: 'none', borderRadius: 12,
          fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 8,
          transition: 'opacity 150ms',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {isLast ? (apiKey.trim() ? 'Save & Start Browsing' : 'Start Browsing') : 'Next'}
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  )
}
