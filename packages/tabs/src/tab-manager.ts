import {
  BaseWindow,
  WebContentsView,
  ipcMain,
  type WebContents,
} from 'electron'
import { IPC } from '@silver/shared'
import type { TabState, TabCreateResult } from '@silver/shared'

export interface TabManagerEvents {
  onTabsChanged: (tabs: TabState[]) => void
  onTabCreated?: (webContents: WebContents) => void
}

export class TabManager {
  private views = new Map<string, WebContentsView>()
  private favicons = new Map<string, string>()
  private incognitoTabs = new Set<string>()
  private incognitoCounter = 0
  private splitId: string | null = null  // second tab shown in split view
  private order: string[] = []
  private activeId: string | null = null
  private window: BaseWindow | null = null
  private contentBounds = { x: 0, y: 0, width: 800, height: 600 }
  private nextId = 1
  private events: TabManagerEvents
  private preloadPath: string
  private settingsPath: string
  private newtabPath: string
  private uiView: WebContentsView | null = null

  constructor(events: TabManagerEvents, preloadPath: string, opts?: { settingsPath?: string; newtabPath?: string }) {
    this.events = events
    this.preloadPath = preloadPath
    this.settingsPath = opts?.settingsPath || ''
    this.newtabPath = opts?.newtabPath || ''
  }

  setWindow(window: BaseWindow) {
    this.window = window
  }

  setUiView(view: WebContentsView) {
    this.uiView = view
  }

  setContentBounds(bounds: { x: number; y: number; width: number; height: number }) {
    this.contentBounds = bounds
    const active = this.activeId ? this.views.get(this.activeId) : null
    if (active) {
      active.setBounds(this.contentBounds)
    }
  }

  create(url?: string): TabCreateResult {
    const id = `tab-${this.nextId++}`

    const view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        plugins: true,  // Required for Widevine CDM
        preload: this.preloadPath,
      },
    })

    // Track navigation events
    const wc = view.webContents
    wc.on('did-start-loading', () => this.emitUpdate())
    wc.on('did-stop-loading', () => this.emitUpdate())
    wc.on('did-navigate', () => this.emitUpdate())
    wc.on('did-navigate-in-page', () => this.emitUpdate())
    wc.on('page-title-updated', () => this.emitUpdate())
    wc.on('page-favicon-updated', (_ev, favicons) => {
      if (favicons && favicons.length > 0) this.favicons.set(id, favicons[0])
      this.emitUpdate()
    })

    // Auto-retry on network errors (502, DNS failure, connection reset)
    let retryCount = 0
    wc.on('did-fail-load', (_event, errorCode, _errorDesc, validatedURL, isMainFrame) => {
      if (!isMainFrame || !validatedURL) return
      // Retry once for transient errors (-2=FAILED, -3=ABORTED, -6=CONNECTION_FAILED, -105=NAME_NOT_RESOLVED, -137=NAME_RESOLUTION_FAILED)
      const retryable = [-2, -3, -6, -7, -21, -100, -101, -105, -106, -137]
      if (retryable.includes(errorCode) && retryCount < 1) {
        retryCount++
        setTimeout(() => wc.loadURL(validatedURL), 300)
      } else {
        retryCount = 0
      }
    })
    wc.on('did-finish-load', () => { retryCount = 0 })

    // Also retry on HTTP 502/503/504 errors
    wc.on('did-navigate', (_event, url, httpResponseCode) => {
      if (httpResponseCode >= 502 && httpResponseCode <= 504 && retryCount < 1) {
        retryCount++
        setTimeout(() => wc.loadURL(url), 500)
      } else if (httpResponseCode < 400) {
        retryCount = 0
      }
    })

    // Open links that request new window in same tab
    wc.setWindowOpenHandler(({ url: targetUrl }) => {
      this.create(targetUrl)
      return { action: 'deny' }
    })

    // Notify listeners (for ad blocking, etc.)
    this.events.onTabCreated?.(wc)

    this.views.set(id, view)
    this.order.push(id)

    // Navigate
    const target = url || ''
    if (!target || target === 'about:blank') {
      // Load new tab page
      if (this.newtabPath) {
        wc.loadFile(this.newtabPath)
      }
    } else {
      wc.loadURL(this.normalizeUrl(target))
    }

    // Switch to new tab
    this.switchTo(id)
    this.emitUpdate()

    return { id }
  }

  createIncognito(url?: string): TabCreateResult {
    const id = `incognito-${this.nextId++}`
    this.incognitoCounter++

    // Each incognito tab gets its own in-memory session (no persistence)
    const partition = `incognito-${this.incognitoCounter}`

    const view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        plugins: true,
        preload: this.preloadPath,
        partition,  // In-memory session — no cookies/cache saved
      },
    })

    const wc = view.webContents

    // Same event tracking as regular tabs
    wc.on('did-start-loading', () => this.emitUpdate())
    wc.on('did-stop-loading', () => this.emitUpdate())
    wc.on('did-navigate', () => this.emitUpdate())
    wc.on('did-navigate-in-page', () => this.emitUpdate())
    wc.on('page-title-updated', () => this.emitUpdate())
    wc.on('page-favicon-updated', (_ev, favicons) => {
      if (favicons && favicons.length > 0) this.favicons.set(id, favicons[0])
      this.emitUpdate()
    })
    wc.setWindowOpenHandler(({ url: targetUrl }) => {
      this.createIncognito(targetUrl)
      return { action: 'deny' }
    })

    this.events.onTabCreated?.(wc)
    this.incognitoTabs.add(id)
    this.views.set(id, view)
    this.order.push(id)

    const target = url || ''
    if (!target || target === 'about:blank') {
      if (this.newtabPath) wc.loadFile(this.newtabPath)
    } else {
      wc.loadURL(this.normalizeUrl(target))
    }

    this.switchTo(id)
    this.emitUpdate()
    return { id }
  }

  close(id: string) {
    const view = this.views.get(id)
    if (!view) return

    // Remove from window
    if (this.window) {
      this.window.contentView.removeChildView(view)
    }

    // Destroy — if incognito, clear the session data
    if (this.incognitoTabs.has(id)) {
      view.webContents.session.clearStorageData().catch(() => {})
      this.incognitoTabs.delete(id)
    }
    view.webContents.close()
    this.views.delete(id)
    this.order = this.order.filter((i) => i !== id)

    // Switch to adjacent tab or create new
    if (this.activeId === id) {
      if (this.order.length > 0) {
        this.switchTo(this.order[this.order.length - 1])
      } else {
        this.create('about:blank')
      }
    }

    this.emitUpdate()
  }

  switchTo(id: string) {
    if (!this.window) return
    const view = this.views.get(id)
    if (!view) return

    // Remove ALL tab views except active + split
    for (const [viewId, v] of this.views) {
      if (viewId !== id && viewId !== this.splitId) {
        try { this.window.contentView.removeChildView(v) } catch {}
      }
    }

    // Show active tab (below UI view)
    this.window.contentView.addChildView(view)

    if (this.splitId && this.splitId !== id) {
      // Split view: active on left, split on right
      const splitView = this.views.get(this.splitId)
      if (splitView) {
        this.window.contentView.addChildView(splitView)
        const halfW = Math.floor(this.contentBounds.width / 2)
        view.setBounds({ ...this.contentBounds, width: halfW - 1 })
        splitView.setBounds({
          ...this.contentBounds,
          x: this.contentBounds.x + halfW + 1,
          width: this.contentBounds.width - halfW - 1,
        })
      } else {
        view.setBounds(this.contentBounds)
      }
    } else {
      view.setBounds(this.contentBounds)
    }

    this.activeId = id
    this.emitUpdate()
  }

  /** Split view: show a second tab beside the active one */
  split(secondTabId: string) {
    this.splitId = secondTabId
    if (this.activeId) this.switchTo(this.activeId)
  }

  /** Exit split view */
  unsplit() {
    if (this.splitId) {
      const splitView = this.views.get(this.splitId)
      if (splitView && this.window) {
        try { this.window.contentView.removeChildView(splitView) } catch {}
      }
      this.splitId = null
      if (this.activeId) this.switchTo(this.activeId)
    }
  }

  getSplitId(): string | null {
    return this.splitId
  }

  navigate(id: string, url: string) {
    const view = this.views.get(id)
    if (!view) return

    // Handle silver:// internal pages
    if (url.startsWith('silver://settings') && this.settingsPath) {
      view.webContents.loadFile(this.settingsPath)
      return
    }

    view.webContents.loadURL(this.normalizeUrl(url))
  }

  back(id: string) {
    const view = this.views.get(id)
    if (view?.webContents.navigationHistory.canGoBack()) {
      view.webContents.navigationHistory.goBack()
    }
  }

  forward(id: string) {
    const view = this.views.get(id)
    if (view?.webContents.navigationHistory.canGoForward()) {
      view.webContents.navigationHistory.goForward()
    }
  }

  reload(id: string) {
    const view = this.views.get(id)
    view?.webContents.reload()
  }

  reorder(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= this.order.length) return
    if (toIndex < 0 || toIndex >= this.order.length) return
    const [moved] = this.order.splice(fromIndex, 1)
    this.order.splice(toIndex, 0, moved)
    this.emitUpdate()
  }

  getActiveId(): string | null {
    return this.activeId
  }

  getWebContents(id: string): WebContents | null {
    return this.views.get(id)?.webContents ?? null
  }

  list(): TabState[] {
    return this.order.map((id) => this.getTabState(id))
  }

  registerIPC() {
    ipcMain.handle(IPC.TAB_CREATE, (_, url?: string) => this.create(url))
    ipcMain.handle(IPC.TAB_CLOSE, (_, id: string) => this.close(id))
    ipcMain.handle(IPC.TAB_SWITCH, (_, id: string) => this.switchTo(id))
    ipcMain.handle(IPC.TAB_NAVIGATE, (_, id: string, url: string) => this.navigate(id, url))
    ipcMain.handle(IPC.TAB_BACK, (_, id: string) => this.back(id))
    ipcMain.handle(IPC.TAB_FORWARD, (_, id: string) => this.forward(id))
    ipcMain.handle(IPC.TAB_RELOAD, (_, id: string) => this.reload(id))
    ipcMain.handle(IPC.TAB_LIST, () => this.list())
    ipcMain.handle(IPC.TAB_REORDER, (_, from: number, to: number) => this.reorder(from, to))
    ipcMain.handle(IPC.TAB_CREATE_INCOGNITO, (_, url?: string) => this.createIncognito(url))
    ipcMain.handle(IPC.TAB_SPLIT, (_, id: string) => this.split(id))
    ipcMain.handle(IPC.TAB_UNSPLIT, () => this.unsplit())
  }

  private getTabState(id: string): TabState {
    const view = this.views.get(id)
    const wc = view?.webContents
    return {
      id,
      url: wc?.getURL() ?? '',
      title: wc?.getTitle() ?? 'New Tab',
      favicon: this.favicons.get(id) || '',
      loading: wc?.isLoading() ?? false,
      canGoBack: wc?.navigationHistory.canGoBack() ?? false,
      canGoForward: wc?.navigationHistory.canGoForward() ?? false,
      incognito: this.incognitoTabs.has(id),
    }
  }

  private emitUpdate() {
    const tabs = this.list()
    this.events.onTabsChanged(tabs)
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('about:')) {
      return url
    }
    // If it looks like a domain, add https
    if (url.includes('.') && !url.includes(' ')) {
      return `https://${url}`
    }
    // Otherwise treat as search
    return `https://www.google.com/search?q=${encodeURIComponent(url)}`
  }
}
