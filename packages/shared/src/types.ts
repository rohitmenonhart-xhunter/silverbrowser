export interface TabState {
  id: string
  url: string
  title: string
  favicon: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  incognito: boolean
}

export interface TabCreateResult {
  id: string
}

export interface GhostStatus {
  running: boolean
  taskId?: string
  currentStep?: number
}

export interface GhostStep {
  step: number
  action: string
  description: string
  result?: string
}

export interface GhostResult {
  success: boolean
  summary: string
  steps: GhostStep[]
}

export interface AdBlockStats {
  totalBlocked: number
  sessionBlocked: number
}

export interface SilverAPI {
  tabs: {
    create: (url?: string) => Promise<TabCreateResult>
    close: (id: string) => Promise<void>
    switch: (id: string) => Promise<void>
    navigate: (id: string, url: string) => Promise<void>
    back: (id: string) => Promise<void>
    forward: (id: string) => Promise<void>
    reload: (id: string) => Promise<void>
    list: () => Promise<TabState[]>
    onUpdate: (cb: (tabs: TabState[]) => void) => () => void
  }
  ghost: {
    run: (task: string) => Promise<string>
    stop: (taskId: string) => Promise<void>
    status: () => Promise<GhostStatus>
    panelToggle: (open: boolean) => void
    chat: (messages: any[]) => Promise<{ content: string; error: boolean }>
    summarize: () => Promise<{ content: string; error: boolean }>
    onStep: (cb: (step: GhostStep) => void) => () => void
    onResult: (cb: (result: GhostResult) => void) => () => void
    onStream: (cb: (text: string) => void) => () => void
  }
  ads: {
    stats: () => Promise<AdBlockStats>
    toggle: (enabled: boolean) => Promise<void>
  }
  settings: {
    get: (key?: string) => Promise<Record<string, unknown>>
    set: (key: string, value: unknown) => Promise<void>
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
}
