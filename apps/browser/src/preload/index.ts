import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@silver/shared'
import type { SilverAPI } from '@silver/shared'

const api: SilverAPI = {
  tabs: {
    create: (url?: string) => ipcRenderer.invoke(IPC.TAB_CREATE, url),
    close: (id: string) => ipcRenderer.invoke(IPC.TAB_CLOSE, id),
    switch: (id: string) => ipcRenderer.invoke(IPC.TAB_SWITCH, id),
    navigate: (id: string, url: string) => ipcRenderer.invoke(IPC.TAB_NAVIGATE, id, url),
    back: (id: string) => ipcRenderer.invoke(IPC.TAB_BACK, id),
    forward: (id: string) => ipcRenderer.invoke(IPC.TAB_FORWARD, id),
    reload: (id: string) => ipcRenderer.invoke(IPC.TAB_RELOAD, id),
    list: () => ipcRenderer.invoke(IPC.TAB_LIST),
    createIncognito: (url?: string) => ipcRenderer.invoke(IPC.TAB_CREATE_INCOGNITO, url),
    split: (id: string) => ipcRenderer.invoke(IPC.TAB_SPLIT, id),
    unsplit: () => ipcRenderer.invoke(IPC.TAB_UNSPLIT),
    reorder: (from: number, to: number) => ipcRenderer.invoke(IPC.TAB_REORDER, from, to),
    onUpdate: (cb) => {
      const handler = (_: unknown, tabs: unknown) => cb(tabs as any)
      ipcRenderer.on(IPC.TAB_UPDATE, handler)
      return () => ipcRenderer.removeListener(IPC.TAB_UPDATE, handler)
    },
  },
  ghost: {
    run: (task: string) => ipcRenderer.invoke(IPC.GHOST_RUN, task),
    stop: (taskId: string) => ipcRenderer.invoke(IPC.GHOST_STOP, taskId),
    status: () => ipcRenderer.invoke(IPC.GHOST_STATUS),
    panelToggle: (open: boolean) => ipcRenderer.send(IPC.GHOST_PANEL_TOGGLE, open),
    togglePanel: () => ipcRenderer.send('silver:ghost:toggle'),
    chat: (messages: any[]) => ipcRenderer.invoke(IPC.GHOST_CHAT, messages),
    summarize: () => ipcRenderer.invoke(IPC.GHOST_SUMMARIZE),
    onStep: (cb) => {
      const handler = (_: unknown, step: unknown) => cb(step as any)
      ipcRenderer.on(IPC.GHOST_STEP, handler)
      return () => ipcRenderer.removeListener(IPC.GHOST_STEP, handler)
    },
    onResult: (cb) => {
      const handler = (_: unknown, result: unknown) => cb(result as any)
      ipcRenderer.on(IPC.GHOST_RESULT, handler)
      return () => ipcRenderer.removeListener(IPC.GHOST_RESULT, handler)
    },
    onStream: (cb) => {
      const handler = (_: unknown, text: unknown) => cb(text as string)
      ipcRenderer.on(IPC.GHOST_STREAM, handler)
      return () => ipcRenderer.removeListener(IPC.GHOST_STREAM, handler)
    },
  },
  ads: {
    stats: () => ipcRenderer.invoke(IPC.ADS_STATS),
    toggle: (enabled: boolean) => ipcRenderer.invoke(IPC.ADS_TOGGLE, enabled),
  },
  settings: {
    get: (key?: string) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  },
  vault: {
    auth: (reason: string) => ipcRenderer.invoke(IPC.VAULT_AUTH, reason),
    hasPIN: () => ipcRenderer.invoke(IPC.VAULT_HAS_PIN),
    setupPIN: (pin: string) => ipcRenderer.invoke(IPC.VAULT_SETUP_PIN, pin),
    verifyPIN: (pin: string) => ipcRenderer.invoke(IPC.VAULT_VERIFY_PIN, pin),
    listPasswords: () => ipcRenderer.invoke(IPC.VAULT_LIST_PASSWORDS),
    deletePassword: (id: string) => ipcRenderer.invoke(IPC.VAULT_DELETE_PASSWORD, id),
    safeList: () => ipcRenderer.invoke(IPC.VAULT_SAFE_LIST),
    safeAdd: (name: string, data: string, mime: string) => ipcRenderer.invoke(IPC.VAULT_SAFE_ADD, name, data, mime),
    safeGet: (id: string) => ipcRenderer.invoke(IPC.VAULT_SAFE_GET, id),
    safeRemove: (id: string) => ipcRenderer.invoke(IPC.VAULT_SAFE_REMOVE, id),
  },
  extensions: {
    list: () => ipcRenderer.invoke(IPC.EXT_LIST),
    install: (path: string) => ipcRenderer.invoke(IPC.EXT_INSTALL, path),
    remove: (id: string) => ipcRenderer.invoke(IPC.EXT_REMOVE, id),
    openStore: () => ipcRenderer.send(IPC.EXT_OPEN_STORE),
    openDir: () => ipcRenderer.send(IPC.EXT_OPEN_DIR),
    menu: () => ipcRenderer.send(IPC.EXT_MENU),
  },
  google: {
    signIn: () => ipcRenderer.invoke('silver:google-signin'),
  },
  shield: {
    toggle: () => ipcRenderer.invoke(IPC.SHIELD_TOGGLE),
    status: () => ipcRenderer.invoke(IPC.SHIELD_STATUS),
    menu: () => ipcRenderer.send(IPC.SHIELD_MENU),
  },
  import: {
    detect: () => ipcRenderer.invoke(IPC.IMPORT_DETECT),
    run: (browserId: string) => ipcRenderer.invoke(IPC.IMPORT_RUN, browserId),
    getData: () => ipcRenderer.invoke(IPC.IMPORT_GET_DATA),
  },
  window: {
    minimize: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC.WINDOW_CLOSE),
  },
  ui: {
    overlay: (open: boolean) => ipcRenderer.send(IPC.UI_OVERLAY, open),
    sidebar: (visible: boolean) => ipcRenderer.send(IPC.UI_SIDEBAR, visible),
    broadcastTheme: (theme: string) => ipcRenderer.send('silver:theme-broadcast', theme),
    permissionResponse: (id: number, allowed: boolean) => ipcRenderer.send('silver:permission-response', { id, allowed }),
  },
  actions: {
    zoomIn: () => ipcRenderer.send(IPC.ACTION_ZOOM_IN),
    zoomOut: () => ipcRenderer.send(IPC.ACTION_ZOOM_OUT),
    zoomReset: () => ipcRenderer.send(IPC.ACTION_ZOOM_RESET),
    print: () => ipcRenderer.send(IPC.ACTION_PRINT),
    devtools: () => ipcRenderer.send(IPC.ACTION_DEVTOOLS),
    fullscreen: () => ipcRenderer.send(IPC.ACTION_FULLSCREEN),
    newWindow: () => ipcRenderer.send(IPC.ACTION_NEW_WINDOW),
    find: () => ipcRenderer.send(IPC.ACTION_FIND),
    settingsMenu: () => ipcRenderer.send(IPC.ACTION_SETTINGS_MENU),
    downloadsMenu: () => ipcRenderer.send(IPC.ACTION_DOWNLOADS_MENU),
  },
}

// Forward events from main to renderer
ipcRenderer.on('silver:focus-addressbar', () => {
  window.dispatchEvent(new Event('silver:focus-addressbar'))
})
ipcRenderer.on('silver:toggle-ghost', () => {
  window.dispatchEvent(new Event('silver:toggle-ghost'))
})
ipcRenderer.on('silver:permission-request', (_, data) => {
  window.dispatchEvent(new CustomEvent('silver:permission-request', { detail: data }))
})
ipcRenderer.on('silver:ghost-sync', (_, open) => {
  window.dispatchEvent(new CustomEvent('silver:ghost-sync', { detail: open }))
})
ipcRenderer.on('silver:theme-sync', (_, theme) => {
  window.dispatchEvent(new CustomEvent('silver:theme-sync', { detail: theme }))
})
ipcRenderer.on('silver:accent-color', (_, color) => {
  window.dispatchEvent(new CustomEvent('silver:accent-color', { detail: color }))
})
ipcRenderer.on('silver:sidebar-state', (_, visible) => {
  window.dispatchEvent(new CustomEvent('silver:sidebar-state', { detail: visible }))
})
ipcRenderer.on('silver:shield-changed', (_, enabled) => {
  window.dispatchEvent(new CustomEvent('silver:shield-changed', { detail: enabled }))
})
ipcRenderer.on('silver:find-in-page', () => {
  window.dispatchEvent(new Event('silver:find-in-page'))
})
ipcRenderer.on('silver:download-started', (_, d) => {
  window.dispatchEvent(new CustomEvent('silver:download-started', { detail: d }))
})
ipcRenderer.on('silver:download-done', (_, d) => {
  window.dispatchEvent(new CustomEvent('silver:download-done', { detail: d }))
})

// Forward page messages to main process
window.addEventListener('message', (e) => {
  if (e.data?.type === 'silver-password-save') {
    ipcRenderer.send('silver-password-detected', {
      username: e.data.username,
      password: e.data.password,
    })
  }
  if (e.data?.type === 'silver-install-extension') {
    ipcRenderer.send('silver-install-extension', e.data.extensionId)
  }
})

// Forward install results back to page
ipcRenderer.on('silver-extension-installed', () => {
  window.postMessage({ type: 'silver-extension-installed' }, '*')
})
ipcRenderer.on('silver-extension-failed', () => {
  window.postMessage({ type: 'silver-extension-failed' }, '*')
})

contextBridge.exposeInMainWorld('silver', api)
