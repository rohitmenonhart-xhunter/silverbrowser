import { create } from 'zustand'
import type { TabState } from '@silver/shared'

declare global {
  interface Window {
    silver: import('@silver/shared').SilverAPI
  }
}

interface TabStore {
  tabs: TabState[]
  activeId: string | null
  setTabs: (tabs: TabState[]) => void
  setActiveId: (id: string) => void
  createTab: (url?: string) => Promise<void>
  closeTab: (id: string) => Promise<void>
  switchTab: (id: string) => Promise<void>
  navigateTab: (id: string, url: string) => Promise<void>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  reload: () => Promise<void>
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeId: null,

  setTabs: (tabs) => {
    set({ tabs })
    // Auto-set activeId to last tab if not set
    if (!get().activeId && tabs.length > 0) {
      set({ activeId: tabs[tabs.length - 1].id })
    }
  },

  setActiveId: (id) => set({ activeId: id }),

  createTab: async (url) => {
    const result = await window.silver.tabs.create(url)
    set({ activeId: result.id })
  },

  closeTab: async (id) => {
    await window.silver.tabs.close(id)
    const { tabs, activeId } = get()
    if (activeId === id) {
      const remaining = tabs.filter((t) => t.id !== id)
      if (remaining.length > 0) {
        set({ activeId: remaining[remaining.length - 1].id })
      }
    }
  },

  switchTab: async (id) => {
    await window.silver.tabs.switch(id)
    set({ activeId: id })
  },

  navigateTab: async (id, url) => {
    await window.silver.tabs.navigate(id, url)
  },

  goBack: async () => {
    const { activeId } = get()
    if (activeId) await window.silver.tabs.back(activeId)
  },

  goForward: async () => {
    const { activeId } = get()
    if (activeId) await window.silver.tabs.forward(activeId)
  },

  reload: async () => {
    const { activeId } = get()
    if (activeId) await window.silver.tabs.reload(activeId)
  },
}))
