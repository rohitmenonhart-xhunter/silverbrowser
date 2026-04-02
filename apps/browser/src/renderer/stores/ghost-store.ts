import { create } from 'zustand'
import type { GhostStep, GhostResult } from '@silver/shared'

export type GhostMode = 'chat' | 'agent'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface GhostStore {
  open: boolean
  mode: GhostMode
  // Agent state
  running: boolean
  steps: GhostStep[]
  thinking: string
  result: GhostResult | null
  // Chat state (page-aware, persistent context)
  chatMessages: ChatMessage[]
  chatLoading: boolean

  toggle: () => void
  setOpen: (open: boolean) => void
  setMode: (mode: GhostMode) => void

  // Agent
  runTask: (task: string) => Promise<void>
  stopTask: () => Promise<void>
  addStep: (step: GhostStep) => void
  setThinking: (text: string) => void
  setResult: (result: GhostResult) => void
  resetAgent: () => void

  // Chat
  sendChat: (text: string) => Promise<void>
  clearChat: () => void
}

export const useGhostStore = create<GhostStore>((set, get) => ({
  open: false,
  mode: 'chat',
  running: false,
  steps: [],
  thinking: '',
  result: null,
  chatMessages: [],
  chatLoading: false,

  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setMode: (mode) => set({ mode }),

  // Agent
  runTask: async (task) => {
    set({ running: true, steps: [], thinking: 'Starting...', result: null })
    await window.silver.ghost.run(task)
  },
  stopTask: async () => {
    await window.silver.ghost.stop('')
    set({ running: false, thinking: '' })
  },
  addStep: (step) => set((s) => ({ steps: [...s.steps, step] })),
  setThinking: (text) => set({ thinking: text }),
  setResult: (result) => set({ result, running: false, thinking: '' }),
  resetAgent: () => set({ steps: [], thinking: '', result: null, running: false }),

  // Chat — page-aware, persistent context
  sendChat: async (text) => {
    const { chatMessages } = get()
    const userMsg: ChatMessage = { role: 'user', content: text }
    const updated = [...chatMessages, userMsg]
    set({ chatMessages: updated, chatLoading: true })

    const llmMessages = [
      { role: 'system', content: 'You are Ghost, a helpful AI assistant inside Silver Browser. The user is browsing a web page and may ask questions about it. You will receive the page content for context. Answer clearly using markdown. Be concise but thorough.' },
      ...updated,
    ]

    const res = await (window.silver as any).ghost.chat(llmMessages)
    const assistantMsg: ChatMessage = { role: 'assistant', content: res.content }
    set((s) => ({
      chatMessages: [...s.chatMessages, assistantMsg],
      chatLoading: false,
    }))
  },
  clearChat: () => set({ chatMessages: [] }),
}))
