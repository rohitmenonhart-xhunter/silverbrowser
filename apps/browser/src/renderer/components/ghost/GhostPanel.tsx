import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useGhostStore, type GhostMode } from '../../stores/ghost-store'

const GHOST_PANEL_WIDTH = 380

// --- SVG Icons ---

const GhostIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 10h.01M15 10h.01"/>
    <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2 3 3-3 3 3 2-3 3 3V10a8 8 0 0 0-8-8z"/>
  </svg>
)

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
)

const SendIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4z"/><path d="m22 2-11 11"/>
  </svg>
)

const StopIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
)

const SettingsIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
)

const AlertIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>
  </svg>
)

const ChatIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const BotIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8"/><rect x="2" y="8" width="20" height="14" rx="2"/>
    <path d="M7 15h0M17 15h0"/>
  </svg>
)

const TrashIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
)

const KeyIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.3 9.3M18 5l3 3"/>
  </svg>
)

// Wave dots for loading
const WaveDots = () => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 20 }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 5, height: 5, borderRadius: '50%',
        background: 'var(--sv-accent)',
        animation: `sv-wave 1.2s ease-in-out ${i * 0.15}s infinite`,
      }} />
    ))}
  </div>
)

// Markdown renderer with custom styles
function Md({ content }: { content: string }) {
  return (
    <div className="ghost-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

// --- Models for settings ---
const MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-haiku-3.5', name: 'Claude Haiku 3.5' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash' },
]

type PanelTab = 'main' | 'settings'

// ======================== GHOST PANEL ========================

export function GhostPanel({ alwaysOpen }: { alwaysOpen?: boolean } = {}) {
  const open = useGhostStore((s) => s.open)
  const mode = useGhostStore((s) => s.mode)
  const toggle = useGhostStore((s) => s.toggle)
  const setMode = useGhostStore((s) => s.setMode)
  const isVisible = alwaysOpen || open

  // Agent
  const running = useGhostStore((s) => s.running)
  const steps = useGhostStore((s) => s.steps)
  const thinking = useGhostStore((s) => s.thinking)
  const result = useGhostStore((s) => s.result)
  const runTask = useGhostStore((s) => s.runTask)
  const stopTask = useGhostStore((s) => s.stopTask)
  const addStep = useGhostStore((s) => s.addStep)
  const setThinking = useGhostStore((s) => s.setThinking)
  const setResult = useGhostStore((s) => s.setResult)

  // Chat
  const chatMessages = useGhostStore((s) => s.chatMessages)
  const chatLoading = useGhostStore((s) => s.chatLoading)
  const sendChat = useGhostStore((s) => s.sendChat)
  const clearChat = useGhostStore((s) => s.clearChat)

  const [input, setInput] = useState('')
  const [tab, setTab] = useState<PanelTab>('main')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('anthropic/claude-sonnet-4')
  const [keySaved, setKeySaved] = useState(false)
  const [closing, setClosing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // IPC listeners for agent mode
  useEffect(() => {
    const unsubStep = window.silver.ghost.onStep(addStep)
    const unsubResult = window.silver.ghost.onResult(setResult)
    const unsubStream = window.silver.ghost.onStream(setThinking)
    return () => { unsubStep(); unsubResult(); unsubStream() }
  }, [])

  // Sync toggle from main process (ghostView receives this to show/hide)
  useEffect(() => {
    const handler = (e: Event) => {
      const shouldOpen = (e as CustomEvent).detail
      useGhostStore.getState().setOpen(shouldOpen)
    }
    window.addEventListener('silver:ghost-sync', handler)
    return () => window.removeEventListener('silver:ghost-sync', handler)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open) { setClosing(false); setTimeout(() => inputRef.current?.focus(), 150) }
  }, [open])

  // Load settings
  useEffect(() => {
    window.silver.settings.get('ghost.apiKey').then((k: any) => k && setApiKey(k))
    window.silver.settings.get('ghost.model').then((m: any) => m && setModel(m))
  }, [])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [steps, thinking, chatMessages, chatLoading])

  const handleClose = useCallback(() => {
    if (alwaysOpen) {
      // Tell main process to close ghost (shrink window, hide ghostView)
      window.silver.ghost.panelToggle(false)
    } else {
      setClosing(true)
      setTimeout(() => { toggle(); setClosing(false) }, 200)
    }
  }, [toggle, alwaysOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    if (mode === 'chat') {
      sendChat(text)
    } else {
      if (!running) runTask(text)
    }
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
  }

  const saveApiKey = async () => {
    await window.silver.settings.set('ghost.apiKey', apiKey)
    setKeySaved(true); setTimeout(() => setKeySaved(false), 2000)
  }
  const saveModel = async (m: string) => {
    setModel(m); await window.silver.settings.set('ghost.model', m)
  }

  if (!isVisible && !closing) return null

  return (
    <>
      <div style={{
        ...(alwaysOpen
          ? { width: '100%', height: '100vh' }
          : { position: 'fixed' as const, top: 0, right: 0, bottom: 0, width: GHOST_PANEL_WIDTH, zIndex: 200 }
        ),
        background: 'var(--sv-bg-base)',
        borderLeft: alwaysOpen ? 'none' : '1px solid var(--sv-border-default)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: alwaysOpen ? 'none' : (closing
          ? 'sv-slide-out-right 200ms cubic-bezier(0.55, 0, 1, 0.45) forwards'
          : 'sv-slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1)'),
        fontFamily: 'var(--sv-font-sans)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 14px 10px', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'var(--sv-accent-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--sv-accent-bright)',
          }}><GhostIcon size={16} /></div>

          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--sv-text-primary)', letterSpacing: '-0.01em' }}>
            Ghost
          </div>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', gap: 2, background: 'var(--sv-bg-active)', borderRadius: 8, padding: 2,
          }}>
            <ModeBtn active={mode === 'chat'} onClick={() => setMode('chat')} icon={<ChatIcon size={12} />} label="Chat" />
            <ModeBtn active={mode === 'agent'} onClick={() => setMode('agent')} icon={<BotIcon size={12} />} label="Agent" />
          </div>

          {/* Settings */}
          <HeaderBtn onClick={() => setTab(tab === 'settings' ? 'main' : 'settings')} active={tab === 'settings'}>
            <SettingsIcon size={13} />
          </HeaderBtn>
          <HeaderBtn onClick={handleClose}><XIcon size={14} /></HeaderBtn>
        </div>

        <div style={{ height: 1, background: 'var(--sv-border-subtle)', margin: '0 14px' }} />

        {/* Content */}
        {tab === 'settings' ? (
          <SettingsView apiKey={apiKey} setApiKey={setApiKey} saveApiKey={saveApiKey}
            keySaved={keySaved} model={model} saveModel={saveModel} />
        ) : mode === 'chat' ? (
          <ChatView messages={chatMessages} loading={chatLoading} clearChat={clearChat} scrollRef={scrollRef} />
        ) : (
          <AgentView steps={steps} thinking={thinking} result={result} running={running} scrollRef={scrollRef} />
        )}

        {/* Input */}
        {tab !== 'settings' && (
          <div style={{ padding: '10px 12px 12px', flexShrink: 0, borderTop: '1px solid var(--sv-border-subtle)' }}>
            {mode === 'agent' && running ? (
              <button onClick={stopTask} style={{
                width: '100%', height: 36, background: 'rgba(242,116,116,0.06)',
                color: 'var(--sv-danger)', border: '1px solid rgba(242,116,116,0.12)',
                borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><StopIcon size={12} />Stop Agent</button>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === 'chat' ? 'Ask about this page...' : 'Describe a task...'}
                  rows={1} spellCheck={false}
                  style={{
                    flex: 1, minHeight: 36, maxHeight: 100, padding: '8px 12px', resize: 'none',
                    background: 'var(--sv-bg-raised)', border: '1px solid var(--sv-border-default)',
                    borderRadius: 10, color: 'var(--sv-text-primary)', fontSize: 12, lineHeight: 1.5,
                    fontFamily: 'var(--sv-font-sans)', outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--sv-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--sv-accent-muted)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--sv-border-default)'; e.currentTarget.style.boxShadow = 'none' }}
                />
                <button type="submit" disabled={!input.trim() || (mode === 'chat' && chatLoading)} style={{
                  width: 36, height: 36, flexShrink: 0,
                  background: input.trim() ? 'var(--sv-accent)' : 'var(--sv-bg-active)',
                  color: input.trim() ? 'var(--sv-bg-base)' : 'var(--sv-text-ghost)',
                  border: 'none', borderRadius: 10, cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><SendIcon size={14} /></button>
              </form>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes sv-wave {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes sv-slide-in-right {
          from { transform: translateX(24px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes sv-slide-out-right {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(24px); opacity: 0; }
        }
        @keyframes sv-step-in {
          from { transform: translateY(6px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .ghost-md { font-size: 12px; line-height: 1.65; color: var(--sv-text-primary); word-break: break-word; }
        .ghost-md p { margin: 0 0 8px; }
        .ghost-md p:last-child { margin-bottom: 0; }
        .ghost-md h1, .ghost-md h2, .ghost-md h3 { font-weight: 600; margin: 12px 0 6px; color: var(--sv-text-primary); }
        .ghost-md h1 { font-size: 15px; }
        .ghost-md h2 { font-size: 13px; }
        .ghost-md h3 { font-size: 12px; }
        .ghost-md ul, .ghost-md ol { margin: 4px 0 8px 16px; padding: 0; }
        .ghost-md li { margin: 2px 0; }
        .ghost-md code { font-family: var(--sv-font-mono); font-size: 11px; padding: 1px 5px; border-radius: 4px; background: var(--sv-bg-active); color: var(--sv-accent-bright); }
        .ghost-md pre { margin: 6px 0; padding: 10px; border-radius: 8px; background: var(--sv-bg-active); overflow-x: auto; }
        .ghost-md pre code { padding: 0; background: none; font-size: 11px; color: var(--sv-text-primary); }
        .ghost-md blockquote { margin: 6px 0; padding: 6px 12px; border-left: 3px solid var(--sv-accent-muted); color: var(--sv-text-secondary); }
        .ghost-md a { color: var(--sv-accent-bright); text-decoration: none; }
        .ghost-md strong { font-weight: 600; }
        .ghost-md table { border-collapse: collapse; margin: 6px 0; width: 100%; font-size: 11px; }
        .ghost-md th, .ghost-md td { border: 1px solid var(--sv-border-default); padding: 4px 8px; text-align: left; }
        .ghost-md th { background: var(--sv-bg-active); font-weight: 600; }
        .ghost-md hr { border: none; border-top: 1px solid var(--sv-border-subtle); margin: 10px 0; }
      `}</style>
    </>
  )
}

// --- Reusable small components ---

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 4,
      background: active ? 'var(--sv-bg-raised)' : 'transparent',
      color: active ? 'var(--sv-text-primary)' : 'var(--sv-text-tertiary)',
      boxShadow: active ? 'var(--sv-shadow-sm)' : 'none',
      transition: 'all 150ms ease',
    }}>{icon}{label}</button>
  )
}

function HeaderBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 8, background: active ? 'var(--sv-bg-hover)' : 'transparent',
      border: 'none', color: active ? 'var(--sv-text-primary)' : 'var(--sv-text-tertiary)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--sv-bg-hover)'; e.currentTarget.style.color = 'var(--sv-text-primary)' }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sv-text-tertiary)' } }}
    >{children}</button>
  )
}

// ======================== CHAT VIEW ========================

function ChatView({ messages, loading, clearChat, scrollRef }: {
  messages: { role: string; content: string }[]; loading: boolean; clearChat: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={scrollRef} style={{
      flex: 1, overflow: 'auto', padding: 14,
      scrollbarWidth: 'thin', scrollbarColor: 'var(--sv-border-default) transparent',
    }}>
      {messages.length === 0 && !loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 12, opacity: 0.5,
        }}>
          <ChatIcon size={28} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sv-text-secondary)' }}>Chat with this page</div>
          <div style={{ fontSize: 11, color: 'var(--sv-text-tertiary)', textAlign: 'center', maxWidth: 220, lineHeight: 1.5 }}>
            Ghost reads the current page and answers your questions about it.
          </div>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={i} style={{
          marginBottom: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          animation: 'sv-step-in 200ms ease',
        }}>
          <div style={{
            maxWidth: '90%', padding: '8px 12px', borderRadius: 10,
            background: msg.role === 'user' ? 'var(--sv-accent-muted)' : 'var(--sv-bg-raised)',
            border: `1px solid ${msg.role === 'user' ? 'var(--sv-accent-muted)' : 'var(--sv-border-subtle)'}`,
          }}>
            {msg.role === 'user' ? (
              <div style={{ fontSize: 12, color: 'var(--sv-text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            ) : (
              <Md content={msg.content} />
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'flex-start', animation: 'sv-step-in 200ms ease' }}>
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--sv-bg-raised)', border: '1px solid var(--sv-border-subtle)',
          }}><WaveDots /></div>
        </div>
      )}

      {messages.length > 0 && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <button onClick={clearChat} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            background: 'none', border: 'none', color: 'var(--sv-text-ghost)',
            fontSize: 10, cursor: 'pointer', borderRadius: 6,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--sv-text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--sv-text-ghost)' }}
          ><TrashIcon size={10} />Clear chat</button>
        </div>
      )}
    </div>
  )
}

// ======================== AGENT VIEW ========================

function AgentView({ steps, thinking, result, running, scrollRef }: {
  steps: any[]; thinking: string; result: any; running: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div ref={scrollRef} style={{
        flex: 1, overflow: 'auto', padding: 14,
        scrollbarWidth: 'thin', scrollbarColor: 'var(--sv-border-default) transparent',
      }}>
        {steps.length === 0 && !running && !result && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 12, opacity: 0.5,
          }}>
            <BotIcon size={28} />
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sv-text-secondary)' }}>Autonomous Agent</div>
            <div style={{ fontSize: 11, color: 'var(--sv-text-tertiary)', textAlign: 'center', maxWidth: 240, lineHeight: 1.5 }}>
              Describe a task. Ghost will plan, browse, search, write files, run commands, and spawn sub-agents autonomously.
            </div>
          </div>
        )}

        {steps.map((step, i) => (
          <div key={i} style={{
            marginBottom: 6, padding: '8px 10px',
            background: step.action === 'done' ? 'rgba(61,214,140,0.06)' : 'var(--sv-accent-muted)',
            borderRadius: 8, border: `1px solid ${step.action === 'done' ? 'rgba(61,214,140,0.12)' : 'var(--sv-border-subtle)'}`,
            animation: 'sv-step-in 200ms ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                color: step.action === 'done' ? 'var(--sv-success)' : 'var(--sv-accent-bright)',
                background: step.action === 'done' ? 'rgba(61,214,140,0.1)' : 'var(--sv-bg-active)',
                padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
              }}>{step.action.replace('sub:', '')}</span>
              {step.action.startsWith('sub:') && (
                <span style={{ fontSize: 9, color: 'var(--sv-text-ghost)', fontWeight: 500 }}>sub-agent</span>
              )}
              <span style={{ fontSize: 9, color: 'var(--sv-text-ghost)' }}>#{step.step}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--sv-text-primary)', lineHeight: 1.5 }}>
              {step.action === 'done' ? <Md content={step.description} /> : step.description.slice(0, 150)}
            </div>
            {step.result && step.action !== 'done' && (
              <div style={{ fontSize: 10, color: 'var(--sv-text-tertiary)', marginTop: 3, borderTop: '1px solid var(--sv-border-subtle)', paddingTop: 3 }}>
                {step.result.slice(0, 100)}
              </div>
            )}
          </div>
        ))}

        {thinking && running && (
          <div style={{
            padding: '10px', background: 'var(--sv-accent-muted)', borderRadius: 8,
            border: '1px solid var(--sv-border-subtle)', animation: 'sv-step-in 200ms ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <WaveDots />
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--sv-accent-bright)' }}>Working</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--sv-text-secondary)', fontStyle: 'italic' }}>
              {thinking.slice(0, 150)}
            </div>
          </div>
        )}
      </div>

      {result && !running && (
        <div style={{
          margin: '0 10px 6px', padding: '8px 10px',
          background: result.success ? 'rgba(61,214,140,0.06)' : 'rgba(242,116,116,0.06)',
          borderRadius: 8, border: `1px solid ${result.success ? 'rgba(61,214,140,0.12)' : 'rgba(242,116,116,0.12)'}`,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
            color: result.success ? 'var(--sv-success)' : 'var(--sv-danger)', marginBottom: 3,
          }}>
            {result.success ? <CheckIcon size={11} /> : <AlertIcon size={11} />}
            {result.success ? 'Complete' : 'Failed'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--sv-text-secondary)', lineHeight: 1.5 }}>
            <Md content={result.summary} />
          </div>
        </div>
      )}
    </>
  )
}

// ======================== SETTINGS VIEW ========================

function SettingsView({ apiKey, setApiKey, saveApiKey, keySaved, model, saveModel }: {
  apiKey: string; setApiKey: (v: string) => void; saveApiKey: () => void; keySaved: boolean;
  model: string; saveModel: (m: string) => void;
}) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 16, scrollbarWidth: 'thin' }}>
      {/* API Key */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--sv-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <KeyIcon size={11} /> API Key
        </div>
        <div style={{ background: 'var(--sv-bg-raised)', borderRadius: 10, border: '1px solid var(--sv-border-subtle)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-or-v1-..."
              type={showKey ? 'text' : 'password'} style={{
                flex: 1, height: 32, padding: '0 10px', background: 'var(--sv-bg-overlay)',
                border: '1px solid var(--sv-border-default)', borderRadius: 7, color: 'var(--sv-text-primary)',
                fontSize: 11, fontFamily: 'var(--sv-font-mono)', outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--sv-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--sv-border-default)'}
            />
            <button onClick={() => setShowKey(!showKey)} style={{
              width: 32, height: 32, borderRadius: 7, background: 'var(--sv-bg-overlay)',
              border: '1px solid var(--sv-border-default)', color: 'var(--sv-text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            }}>{showKey ? 'H' : 'S'}</button>
          </div>
          <button onClick={saveApiKey} style={{
            height: 30, borderRadius: 7, border: 'none',
            background: keySaved ? 'rgba(61,214,140,0.1)' : 'var(--sv-accent-muted)',
            color: keySaved ? 'var(--sv-success)' : 'var(--sv-accent-bright)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>{keySaved ? <><CheckIcon size={10} /> Saved</> : 'Save Key'}</button>
          <div style={{ fontSize: 10, color: 'var(--sv-text-ghost)' }}>
            Get your key from <span style={{ color: 'var(--sv-text-secondary)' }}>openrouter.ai/keys</span>
          </div>
        </div>
      </div>

      {/* Model */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--sv-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Model</div>
        <div style={{ background: 'var(--sv-bg-raised)', borderRadius: 10, border: '1px solid var(--sv-border-subtle)', overflow: 'hidden' }}>
          {MODELS.map((m, i) => (
            <button key={m.id} onClick={() => saveModel(m.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', padding: '9px 10px', gap: 8,
              background: model === m.id ? 'var(--sv-accent-muted)' : 'transparent', border: 'none',
              borderBottom: i < MODELS.length - 1 ? '1px solid var(--sv-border-subtle)' : 'none',
              cursor: 'pointer', textAlign: 'left',
            }}
              onMouseEnter={e => { if (model !== m.id) e.currentTarget.style.background = 'var(--sv-bg-hover)' }}
              onMouseLeave={e => { if (model !== m.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 5,
                border: `2px solid ${model === m.id ? 'var(--sv-accent)' : 'var(--sv-border-strong)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {model === m.id && <div style={{ width: 7, height: 7, borderRadius: 3, background: 'var(--sv-accent)' }} />}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: model === m.id ? 'var(--sv-text-primary)' : 'var(--sv-text-secondary)' }}>
                {m.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
