import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, MenuItem, session, WebContentsView } from 'electron'
import { join } from 'path'
import { TabManager } from '@silver/tabs'
import { IPC } from '@silver/shared'
import { SilverBlocker, injectYouTubeAdBlocker, injectHotstarAdBlocker, injectCosmeticFilters } from '@silver/adblocker'
import { GhostAgent } from '@silver/ghost'
import { LLMClient, OpenRouterProvider } from '@silver/llm'
import { BrowserImporter, detectBrowsers } from '@silver/importer'
import { Crypto, PasswordManager, SafeFolder, VaultAuth } from '@silver/vault'
import { SilverShield } from '@silver/shield'
import { SettingsStore } from './store'
import { activateReaderMode } from './reader'
import { togglePiP } from './pip'
import { setupStealthHeaders, injectStealth } from './stealth'
import { setupGoogleAuthIPC } from './google-auth'
import { ExtensionManager } from './extensions'
// CWS removed — will host own extension store

// castLabs Electron handles Widevine automatically via components API

// Chrome identity at Chromium engine level
const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.139 Safari/537.36'
app.userAgentFallback = CHROME_UA

// Chromium flags to make us look like real Chrome to Google
app.commandLine.appendSwitch('disable-features', 'EnableCaptivePortalDetection')
app.commandLine.appendSwitch('enable-features', 'AllowGoogleToTrackYou')  // ironic but needed

// Arc-style layout: sidebar on left, content on right
const SIDEBAR_WIDTH = 260
const TOP_BAR_HEIGHT = 52  // minimal top bar with traffic lights + nav
const GHOST_PANEL_WIDTH = 380

let mainWindow: BrowserWindow | null = null
let uiView: WebContentsView | null = null
let ghostView: WebContentsView | null = null
let tabManager: TabManager | null = null
let ghostAgent: GhostAgent | null = null
let ghostPanelOpen = false
let uiOverlay = false
let sidebarVisible = true
const blocker = new SilverBlocker()
const settings = new SettingsStore()
const crypto = new Crypto()
const passwordManager = new PasswordManager(crypto)
const safeFolder = new SafeFolder(crypto)
const vaultAuth = new VaultAuth()
const shield = new SilverShield()
const extensions = new ExtensionManager()

function toggleSidebar() {
  sidebarVisible = !sidebarVisible
  if (mainWindow) mainWindow.setWindowButtonVisibility(sidebarVisible)
  uiView?.webContents.send('silver:sidebar-state', sidebarVisible)
  updateLayout()
}


function updateLayout() {
  if (!mainWindow) return
  const [width, height] = mainWindow.getContentSize()

  const sideW = sidebarVisible ? SIDEBAR_WIDTH : 0
  const ghostW = ghostPanelOpen ? GHOST_PANEL_WIDTH : 0

  // UI view: sidebar only (never expands for ghost)
  const uiW = uiOverlay ? width : Math.max(sideW, 48)
  uiView?.setBounds({ x: 0, y: 0, width: uiW, height })

  // Tab content: between sidebar and ghost panel
  const contentLeft = sidebarVisible ? sideW : 48
  const contentWidth = width - contentLeft - ghostW
  tabManager?.setContentBounds({
    x: contentLeft,
    y: 0,
    width: Math.max(contentWidth, 200),
    height,
  })

  // Ghost view: right edge of window
  if (ghostView) {
    if (ghostPanelOpen) {
      ghostView.setBounds({ x: width - GHOST_PANEL_WIDTH, y: 0, width: GHOST_PANEL_WIDTH, height })
    } else {
      ghostView.setBounds({ x: width, y: 0, width: 0, height: 0 })
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#131316',
    transparent: false,
    vibrancy: 'sidebar',
  } as any)

  // Set UA on the session too (belt and suspenders)
  session.defaultSession.setUserAgent(CHROME_UA)
  setupStealthHeaders(session.defaultSession, shield)

  // Ad blocking
  blocker.initialize(session.defaultSession)

  // UI view (React renderer)
  uiView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
    },
  })
  mainWindow.contentView.addChildView(uiView)

  // Ghost panel view — separate view on the right side, shares preload/IPC
  ghostView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
    },
  })
  ghostView.setBounds({ x: 0, y: 0, width: 0, height: 0 }) // hidden initially
  mainWindow.contentView.addChildView(ghostView)

  // Tab manager
  const preloadPath = join(__dirname, '../preload/index.js')
  // Settings page path — in dev it's in src, in prod it's in out
  const pagesDir = process.env.ELECTRON_RENDERER_URL
    ? join(__dirname, '../../src/renderer/pages')
    : join(__dirname, '../renderer/pages')
  tabManager = new TabManager(
    {
      onTabsChanged: (tabs) => {
        uiView?.webContents.send(IPC.TAB_UPDATE, tabs)
      },
      onTabCreated: (webContents) => {
        // Extract dominant color from actual page pixels for adaptive UI
        const extractColor = () => {
          if (webContents.isDestroyed()) return
          // Capture a small region from the top of the page
          webContents.capturePage({ x: 0, y: 0, width: 200, height: 80 }).then((img) => {
            if (!img || img.isEmpty()) return
            const bitmap = img.toBitmap()
            const w = img.getSize().width
            // Sample ~20 pixels spread across the captured region
            let rSum = 0, gSum = 0, bSum = 0, count = 0
            for (let sx = 10; sx < w && sx < 200; sx += 10) {
              for (let sy = 5; sy < 80; sy += 20) {
                const offset = (sy * w + sx) * 4
                if (offset + 2 < bitmap.length) {
                  // Bitmap is BGRA format
                  rSum += bitmap[offset + 2]
                  gSum += bitmap[offset + 1]
                  bSum += bitmap[offset]
                  count++
                }
              }
            }
            if (count > 0) {
              const r = Math.round(rSum / count)
              const g = Math.round(gSum / count)
              const b = Math.round(bSum / count)
              if (uiView && !uiView.webContents.isDestroyed()) {
                uiView.webContents.send('silver:accent-color', `rgb(${r},${g},${b})`)
              }
            }
          }).catch(() => {})
        }
        webContents.on('did-finish-load', () => setTimeout(extractColor, 800))
        webContents.on('did-navigate', () => setTimeout(extractColor, 1200))

        injectStealth(webContents)
        injectYouTubeAdBlocker(webContents)
        injectHotstarAdBlocker(webContents)
        injectCosmeticFilters(webContents)
        setupContextMenu(webContents)

        // Auto-submit AI query from NTP
        webContents.on('did-finish-load', () => {
          const url = webContents.getURL()
          const query = settings.get('_ai_autosubmit') as string
          const provider = settings.get('_ai_provider') as string
          if (!query) return

          const isClaude = url.includes('claude.ai') && provider === 'claude'
          const isChatGPT = url.includes('chatgpt.com') && provider === 'chatgpt'
          const isGemini = url.includes('gemini.google.com') && provider === 'gemini'

          if (isClaude || isChatGPT || isGemini) {
            // Clear the stored query so it doesn't repeat
            settings.set('_ai_autosubmit', '')
            settings.set('_ai_provider', '')

            // Wait for the page to fully render, then type and submit
            setTimeout(() => {
              webContents.executeJavaScript(`
                (function() {
                  var q = ${JSON.stringify(query)};
                  // Find the main input/textarea
                  var el = document.querySelector('div[contenteditable="true"], textarea[placeholder], div.ProseMirror, textarea');
                  if (!el) return;

                  // Focus and type
                  el.focus();
                  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                    var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
                      || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
                    if (setter) setter.call(el, q);
                    else el.value = q;
                    el.dispatchEvent(new Event('input', {bubbles: true}));
                  } else {
                    // contenteditable div
                    el.textContent = q;
                    el.dispatchEvent(new Event('input', {bubbles: true}));
                  }

                  // Click send button after brief delay
                  setTimeout(function() {
                    var btn = document.querySelector('button[aria-label*="Send"], button[data-testid*="send"], button[type="submit"], button:has(svg)');
                    // Try to find the send button more specifically
                    var buttons = document.querySelectorAll('button');
                    for (var i = 0; i < buttons.length; i++) {
                      var b = buttons[i];
                      var label = (b.getAttribute('aria-label') || b.textContent || '').toLowerCase();
                      if (label.includes('send') || label.includes('submit')) {
                        b.click();
                        return;
                      }
                    }
                    // Fallback: press Enter
                    el.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true}));
                  }, 500);
                })();
              `).catch(() => {})
            }, 2000)
          }
        })
        setupPasswordDetection(webContents)

        // Listen for password save messages from injected scripts
        webContents.on('console-message', () => {}) // keep alive
        webContents.on('ipc-message', (_event, channel, ...args) => {
          if (channel === 'silver-password-detected') {
            const { username, password } = args[0] as any
            let domain = ''
            try { domain = new URL(webContents.getURL()).hostname } catch { return }
            // Show a save prompt via dialog
            const { dialog: d } = require('electron')
            const result = d.showMessageBoxSync(mainWindow!, {
              type: 'question',
              buttons: ['Save', 'Never for this site', 'Not now'],
              defaultId: 0,
              title: 'Save Password?',
              message: `Save password for ${username} on ${domain}?`,
            })
            if (result === 0) {
              passwordManager.save(domain, username, password, webContents.getURL())
            }
          }
        })
      },
    },
    preloadPath,
    {
      settingsPath: join(pagesDir, 'settings.html'),
      newtabPath: join(pagesDir, 'newtab.html'),
    },
  )
  tabManager.setWindow(mainWindow)
  tabManager.setUiView(uiView)
  tabManager.registerIPC()
  setupGoogleAuthIPC()

  // Ad block IPC
  ipcMain.handle(IPC.ADS_STATS, () => blocker.getStats())
  ipcMain.handle(IPC.ADS_TOGGLE, (_, enabled: boolean) => blocker.toggle(enabled))

  // Import IPC
  const importer = new BrowserImporter()

  ipcMain.handle(IPC.IMPORT_DETECT, () => detectBrowsers())
  ipcMain.handle(IPC.IMPORT_RUN, (_, browserId: string) => {
    const result = importer.import(browserId)
    if (result.success) {
      settings.set('imported.bookmarks', result.bookmarks)
      settings.set('imported.history', result.history)
      settings.set('imported.browser', result.browser)
    }
    return result
  })
  ipcMain.handle(IPC.IMPORT_GET_DATA, () => ({
    bookmarks: settings.get('imported.bookmarks') || [],
    history: settings.get('imported.history') || [],
  }))

  // Settings IPC
  ipcMain.handle(IPC.SETTINGS_GET, (_, key?: string) => settings.get(key))
  ipcMain.handle(IPC.SETTINGS_SET, (_, key: string, value: unknown) => settings.set(key, value))

  // --- Vault: Password Manager ---
  ipcMain.handle(IPC.VAULT_SAVE_PASSWORD, (_, domain: string, username: string, password: string, url: string) => {
    return passwordManager.save(domain, username, password, url)
  })

  ipcMain.handle(IPC.VAULT_GET_PASSWORDS, async (_, domain: string) => {
    // Require biometric before returning passwords
    const authed = await vaultUnlock('access saved passwords')
    if (!authed) return []
    return passwordManager.getForDomain(domain)
  })

  ipcMain.handle(IPC.VAULT_LIST_PASSWORDS, () => {
    return passwordManager.list()
  })

  ipcMain.handle(IPC.VAULT_DELETE_PASSWORD, (_, id: string) => {
    passwordManager.delete(id)
  })

  // Auto-fill: when a page loads, check if we have credentials for it
  ipcMain.handle(IPC.VAULT_AUTOFILL, (_, domain: string) => {
    const creds = passwordManager.getForDomain(domain)
    if (creds.length === 0) return null
    // Return the first match (no biometric needed for auto-fill hint, just username)
    return { username: creds[0].username, hasPassword: true }
  })

  // --- Vault: Safe Folder ---
  ipcMain.handle(IPC.VAULT_SAFE_LIST, async () => {
    const authed = await vaultUnlock('access Safe Folder')
    if (!authed) return { error: 'auth_failed', files: [] }
    return { files: safeFolder.list() }
  })

  ipcMain.handle(IPC.VAULT_SAFE_ADD, async (_, name: string, dataBase64: string, mimeType: string) => {
    const authed = await vaultUnlock('add file to Safe Folder')
    if (!authed) return { error: 'auth_failed' }
    const data = Buffer.from(dataBase64, 'base64')
    return safeFolder.addFile(name, data, mimeType)
  })

  ipcMain.handle(IPC.VAULT_SAFE_GET, async (_, id: string) => {
    const authed = await vaultUnlock('access file in Safe Folder')
    if (!authed) return { error: 'auth_failed' }
    const result = safeFolder.getFile(id)
    if (!result) return null
    return { file: result.file, data: result.data.toString('base64') }
  })

  ipcMain.handle(IPC.VAULT_SAFE_REMOVE, async (_, id: string) => {
    const authed = await vaultUnlock('remove file from Safe Folder')
    if (!authed) return { error: 'auth_failed' }
    safeFolder.removeFile(id)
  })

  // --- Vault Auth: Touch ID → PIN fallback ---
  ipcMain.handle(IPC.VAULT_HAS_PIN, () => vaultAuth.hasPIN())
  ipcMain.handle(IPC.VAULT_SETUP_PIN, (_, pin: string) => {
    vaultAuth.setupPIN(pin)
    return true
  })
  ipcMain.handle(IPC.VAULT_VERIFY_PIN, (_, pin: string) => vaultAuth.verifyPIN(pin))

  ipcMain.handle(IPC.VAULT_BIOMETRIC_AUTH, async (_, reason: string) => {
    return vaultUnlock(reason)
  })

  ipcMain.handle(IPC.VAULT_AUTH, async (_, reason: string) => {
    return vaultUnlock(reason)
  })

  async function vaultUnlock(reason: string): Promise<boolean> {
    const { systemPreferences } = require('electron')

    // Try Touch ID first
    if (systemPreferences.canPromptTouchID()) {
      try {
        await systemPreferences.promptTouchID(`Silver Browser wants to ${reason}`)
        return true
      } catch {
        // Touch ID cancelled/failed — fall through to PIN
      }
    }

    // Fall back to PIN
    if (!vaultAuth.hasPIN()) {
      // No PIN set — prompt to create one
      const pinResult = await promptForInput('Set Vault PIN', 'Create a PIN to protect your vault:', true)
      if (!pinResult) return false
      vaultAuth.setupPIN(pinResult)
      return true
    }

    // Verify existing PIN
    const pin = await promptForInput('Vault Locked', `Enter your PIN to ${reason}:`, true)
    if (!pin) return false
    return vaultAuth.verifyPIN(pin)
  }

  function promptForInput(title: string, message: string, isPassword: boolean): Promise<string | null> {
    // Use a BrowserWindow as a PIN input dialog
    return new Promise((resolve) => {
      const { BrowserWindow: BW } = require('electron')
      const pinWin = new BW({
        width: 360, height: 200,
        parent: mainWindow!, modal: true,
        resizable: false, minimizable: false, maximizable: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#131316',
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      })

      const html = `<!DOCTYPE html>
        <html><head><style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:-apple-system,system-ui,sans-serif; background:#1a1a1e; color:#e8e9ed; padding:28px 24px; -webkit-app-region:drag; }
          h3 { font-size:15px; font-weight:600; margin-bottom:4px; color:#c0c4ce; }
          p { font-size:12px; color:#848894; margin-bottom:16px; }
          input { width:100%; height:36px; padding:0 12px; background:#232328; border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#e8e9ed; font-size:16px; letter-spacing:${isPassword ? '4px' : '0'}; text-align:center; outline:none; -webkit-app-region:no-drag; }
          input:focus { border-color:rgba(192,196,206,0.4); }
          .btns { display:flex; gap:8px; margin-top:14px; -webkit-app-region:no-drag; }
          button { flex:1; height:32px; border:none; border-radius:6px; font-size:12px; cursor:pointer; font-weight:500; }
          .cancel { background:rgba(255,255,255,0.06); color:#848894; }
          .ok { background:#c0c4ce; color:#1a1a1e; }
        </style></head><body>
          <h3>${title}</h3>
          <p>${message}</p>
          <input id="pin" type="${isPassword ? 'password' : 'text'}" autofocus placeholder="••••" maxlength="20">
          <div class="btns">
            <button class="cancel" onclick="send(null)">Cancel</button>
            <button class="ok" onclick="send(document.getElementById('pin').value)">Confirm</button>
          </div>
          <script>
            function send(v) { document.title = v === null ? '__CANCEL__' : '__PIN__' + v; }
            document.getElementById('pin').addEventListener('keydown', (e) => {
              if (e.key === 'Enter') send(document.getElementById('pin').value);
              if (e.key === 'Escape') send(null);
            });
          </script>
        </body></html>`

      pinWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

      // Watch for title change (our IPC workaround for modal dialogs)
      pinWin.webContents.on('page-title-updated', (_e, title) => {
        if (title === '__CANCEL__') {
          pinWin.close()
          resolve(null)
        } else if (title.startsWith('__PIN__')) {
          const val = title.slice(6)
          pinWin.close()
          resolve(val || null)
        }
      })

      pinWin.on('closed', () => resolve(null))
    })
  }

  // --- Password auto-save detection: inject into tabs ---
  const setupPasswordDetection = (wc: Electron.WebContents) => {
    wc.on('did-finish-load', () => {
      const url = wc.getURL()
      if (!url.startsWith('http')) return

      let domain = ''
      try { domain = new URL(url).hostname } catch { return }

      // Inject form submit listener to capture credentials
      wc.executeJavaScript(`
        (() => {
          if (window.__silverPasswordWatch) return;
          window.__silverPasswordWatch = true;

          // Watch for form submissions
          document.addEventListener('submit', (e) => {
            const form = e.target;
            if (!form || form.tagName !== 'FORM') return;
            const inputs = form.querySelectorAll('input');
            let username = '';
            let password = '';
            inputs.forEach(inp => {
              if (inp.type === 'password' && inp.value) password = inp.value;
              if ((inp.type === 'text' || inp.type === 'email' || inp.name === 'username' || inp.name === 'email' || inp.autocomplete === 'username') && inp.value) {
                username = inp.value;
              }
            });
            if (username && password) {
              // Send to main process via a custom event
              window.postMessage({ type: 'silver-password-save', username, password }, '*');
            }
          }, true);

          // Also listen for Enter key on password fields
          document.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const el = document.activeElement;
            if (!el || el.tagName !== 'INPUT') return;
            const form = el.closest('form');
            if (!form) return;
            const inputs = form.querySelectorAll('input');
            let username = '';
            let password = '';
            inputs.forEach(inp => {
              if (inp.type === 'password' && inp.value) password = inp.value;
              if ((inp.type === 'text' || inp.type === 'email' || inp.name === 'username' || inp.name === 'email') && inp.value) {
                username = inp.value;
              }
            });
            if (username && password) {
              window.postMessage({ type: 'silver-password-save', username, password }, '*');
            }
          }, true);

          // Listen for messages from the injected script
          window.addEventListener('message', (e) => {
            if (e.data?.type === 'silver-password-save') {
              // This gets picked up by the preload
            }
          });
        })();
      `).catch(() => {})

      // Auto-fill: check if we have credentials for this domain
      const creds = passwordManager.getForDomain(domain)
      if (creds.length > 0) {
        const cred = creds[0]
        wc.executeJavaScript(`
          (() => {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
              const inputs = form.querySelectorAll('input');
              let userInput = null;
              let passInput = null;
              inputs.forEach(inp => {
                if (inp.type === 'password') passInput = inp;
                if (inp.type === 'text' || inp.type === 'email' || inp.name === 'username' || inp.name === 'email' || inp.autocomplete === 'username') userInput = inp;
              });
              if (userInput && passInput) {
                // Set values using native setter for React compatibility
                const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
                if (setter) {
                  setter.call(userInput, ${JSON.stringify(cred.username)});
                  setter.call(passInput, ${JSON.stringify(cred.password)});
                } else {
                  userInput.value = ${JSON.stringify(cred.username)};
                  passInput.value = ${JSON.stringify(cred.password)};
                }
                userInput.dispatchEvent(new Event('input', {bubbles: true}));
                passInput.dispatchEvent(new Event('input', {bubbles: true}));
                userInput.style.backgroundColor = 'rgba(110,231,168,0.08)';
                passInput.style.backgroundColor = 'rgba(110,231,168,0.08)';
              }
            });
          })();
        `).catch(() => {})
      }
    })
  }

  // --- Extensions ---
  extensions.loadAll(session.defaultSession)

  ipcMain.handle(IPC.EXT_LIST, () => extensions.list())

  ipcMain.handle(IPC.EXT_INSTALL, async (_, extPath: string) => {
    return extensions.installFromPath(extPath, session.defaultSession)
  })

  ipcMain.handle(IPC.EXT_REMOVE, async (_, id: string) => {
    await extensions.remove(id, session.defaultSession)
  })


  ipcMain.on(IPC.EXT_MENU, () => {
    const exts = extensions.list()
    const items: Electron.MenuItemConstructorOptions[] = []

    items.push({ label: '🧩  Silver Extension Store — Coming Soon', enabled: false })
    items.push({ type: 'separator' })

    if (exts.length === 0) {
      items.push({ label: 'No extensions installed', enabled: false })
    } else {
      for (const ext of exts) {
        items.push({
          label: `${ext.name} v${ext.version}`,
          submenu: [
            { label: 'Remove', click: () => extensions.remove(ext.id, session.defaultSession) },
          ],
        })
      }
    }

    items.push({ type: 'separator' })
    items.push({ label: 'Open Extensions Folder', click: () => { const { shell } = require('electron'); shell.openPath(extensions.getExtensionsDir()) } })
    items.push({ label: 'Manage Extensions', click: () => {
      const id = tabManager?.getActiveId()
      if (id) tabManager?.navigate(id, 'silver://settings')
    }})

    const menu = Menu.buildFromTemplate(items)
    menu.popup({ window: mainWindow! })
  })

  ipcMain.on(IPC.EXT_OPEN_STORE, () => {
    // Open Silver Extensions in a new tab
    tabManager?.create('https://hitroo.com/extensions')
  })

  ipcMain.on(IPC.EXT_OPEN_DIR, () => {
    const { shell } = require('electron')
    shell.openPath(extensions.getExtensionsDir())
  })

  // --- Shield (encrypted browsing) ---
  ipcMain.handle(IPC.SHIELD_TOGGLE, async () => {
    if (shield.isEnabled()) {
      shield.disable()
      settings.set('shield.enabled', false)
    } else {
      await shield.enable(session.defaultSession)
      settings.set('shield.enabled', true)
    }
    return shield.isEnabled()
  })

  ipcMain.handle(IPC.SHIELD_STATUS, async () => {
    return shield.getStatus()
  })

  ipcMain.on(IPC.SHIELD_MENU, async () => {
    const status = await shield.getStatus()
    const items: Electron.MenuItemConstructorOptions[] = [
      { label: `Silver Shield — ${status.enabled ? 'ON' : 'OFF'}`, enabled: false },
      { type: 'separator' },
      { label: `DNS: ${status.enabled ? 'Encrypted (Cloudflare 1.1.1.1)' : 'System Default'}`, enabled: false },
      { label: `IP: ${status.ip || 'Checking...'}`, enabled: false },
      { label: `Location: ${status.location || 'Unknown'}`, enabled: false },
      { label: `Latency: ${status.latency ? status.latency + 'ms' : '—'}`, enabled: false },
      { type: 'separator' },
      {
        label: status.enabled ? 'Disable Shield' : 'Enable Shield',
        click: async () => {
          if (shield.isEnabled()) {
            shield.disable()
            settings.set('shield.enabled', false)
          } else {
            await shield.enable(session.defaultSession)
            settings.set('shield.enabled', true)
          }
          // Notify renderer to update icon
          uiView?.webContents.send('silver:shield-changed', shield.isEnabled())
        },
      },
    ]
    const menu = Menu.buildFromTemplate(items)
    menu.popup({ window: mainWindow! })
  })

  // Auto-enable Shield if user had it on
  if (settings.get('shield.enabled')) {
    shield.enable(session.defaultSession)
  }

  // Ghost panel toggle — expand/shrink window, show/hide ghostView
  function setGhostOpen(open: boolean) {
    if (ghostPanelOpen === open) return
    ghostPanelOpen = open
    if (mainWindow) {
      const [w, h] = mainWindow.getSize()
      mainWindow.setSize(w + (open ? GHOST_PANEL_WIDTH : -GHOST_PANEL_WIDTH), h, true)
    }
    ghostView?.webContents.send('silver:ghost-sync', open)
    updateLayout()
  }

  // From ghostView's close button or store
  ipcMain.on(IPC.GHOST_PANEL_TOGGLE, (_, open: boolean) => setGhostOpen(open))

  // From sidebar toggle button
  ipcMain.on('silver:ghost:toggle', () => setGhostOpen(!ghostPanelOpen))

  // Sidebar toggle (from renderer button click)
  ipcMain.on(IPC.UI_SIDEBAR, () => {
    toggleSidebar()
  })

  // UI overlay toggle
  ipcMain.on(IPC.UI_OVERLAY, (_, open: boolean) => {
    uiOverlay = open
    updateLayout()
  })

  // Theme broadcast — sync theme across all views
  ipcMain.on('silver:theme-broadcast', (_, theme: string) => {
    ghostView?.webContents.send('silver:theme-sync', theme)
    uiView?.webContents.send('silver:theme-sync', theme)
  })

  // Menu actions — these do the actual work
  const getActiveWC = () => {
    const id = tabManager?.getActiveId()
    return id ? tabManager?.getWebContents(id) : null
  }

  ipcMain.on(IPC.ACTION_ZOOM_IN, () => {
    const wc = getActiveWC()
    if (wc) wc.setZoomLevel(wc.getZoomLevel() + 0.5)
  })
  ipcMain.on(IPC.ACTION_ZOOM_OUT, () => {
    const wc = getActiveWC()
    if (wc) wc.setZoomLevel(wc.getZoomLevel() - 0.5)
  })
  ipcMain.on(IPC.ACTION_ZOOM_RESET, () => {
    const wc = getActiveWC()
    if (wc) wc.setZoomLevel(0)
  })
  ipcMain.on(IPC.ACTION_PRINT, () => {
    const wc = getActiveWC()
    if (wc) wc.print()
  })
  ipcMain.on(IPC.ACTION_DEVTOOLS, () => {
    const wc = getActiveWC()
    if (wc) wc.toggleDevTools()
  })
  ipcMain.on(IPC.ACTION_FULLSCREEN, () => {
    mainWindow?.setFullScreen(!mainWindow.isFullScreen())
  })
  ipcMain.on(IPC.ACTION_NEW_WINDOW, () => {
    createWindow()
  })
  ipcMain.on(IPC.ACTION_FIND, () => {
    uiView?.webContents.send('silver:find-in-page')
  })

  ipcMain.on(IPC.ACTION_DOWNLOADS_MENU, () => {
    const { shell } = require('electron')
    const items: Electron.MenuItemConstructorOptions[] = []

    if (downloads.length === 0) {
      items.push({ label: 'No downloads yet', enabled: false })
    } else {
      // Show last 10 downloads, newest first
      const recent = downloads.slice(-10).reverse()
      for (const d of recent) {
        const icon = d.state === 'completed' ? '✓' : d.state === 'progressing' ? '↓' : '✗'
        const size = d.total > 0 ? ` (${(d.total / 1024 / 1024).toFixed(1)} MB)` : ''
        items.push({
          label: `${icon}  ${d.filename}${size}`,
          click: () => {
            // Open containing folder
            const downloadPath = app.getPath('downloads')
            shell.showItemInFolder(require('path').join(downloadPath, d.filename))
          },
        })
      }
    }

    items.push({ type: 'separator' })
    items.push({
      label: 'Open Downloads Folder',
      click: () => {
        const { shell } = require('electron')
        shell.openPath(app.getPath('downloads'))
      },
    })

    const menu = Menu.buildFromTemplate(items)
    menu.popup({ window: mainWindow! })
  })

  // --- Reader Mode + PiP ---
  ipcMain.on(IPC.ACTION_READER_MODE, async () => {
    const wc = getActiveWC()
    if (wc) activateReaderMode(wc)
  })

  ipcMain.on(IPC.ACTION_PIP, async () => {
    const wc = getActiveWC()
    if (wc) togglePiP(wc)
  })

  ipcMain.on(IPC.ACTION_SETTINGS_MENU, () => {
    const wc = getActiveWC()
    const menu = Menu.buildFromTemplate([
      { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => { tabManager?.create(); uiView?.webContents.send('silver:focus-addressbar') } },
      { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
      { label: 'New Incognito Tab', accelerator: 'CmdOrCtrl+Shift+N', click: () => { tabManager?.createIncognito(); uiView?.webContents.send('silver:focus-addressbar') } },
      { type: 'separator' },
      { label: 'Find in Page', accelerator: 'CmdOrCtrl+F', click: () => uiView?.webContents.send('silver:find-in-page') },
      { label: 'Print', accelerator: 'CmdOrCtrl+P', click: () => wc?.print() },
      { type: 'separator' },
      { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => { if (wc) wc.setZoomLevel(wc.getZoomLevel() + 0.5) } },
      { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => { if (wc) wc.setZoomLevel(wc.getZoomLevel() - 0.5) } },
      { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => wc?.setZoomLevel(0) },
      { type: 'separator' },
      { label: 'Ghost Agent', accelerator: 'CmdOrCtrl+K', click: () => setGhostOpen(!ghostPanelOpen) },
      { type: 'separator' },
      { label: `Silver Shield ${shield.isEnabled() ? '(On)' : '(Off)'}`, click: async () => { if (shield.isEnabled()) { shield.disable(); settings.set('shield.enabled', false) } else { await shield.enable(session.defaultSession); settings.set('shield.enabled', true) } } },
      { label: 'Reader Mode', click: () => { if (wc) activateReaderMode(wc) } },
      { label: 'Picture in Picture', click: () => { if (wc) togglePiP(wc) } },
      { type: 'separator' },
      { label: 'Developer Tools', accelerator: 'CmdOrCtrl+Alt+I', click: () => wc?.toggleDevTools() },
      { label: 'Full Screen', accelerator: 'CmdOrCtrl+Shift+F', click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
      { type: 'separator' },
      { label: tabManager?.getSplitId() ? 'Exit Split View' : 'Split View', click: () => {
        if (tabManager?.getSplitId()) {
          tabManager?.unsplit()
        } else {
          // Split with the next tab
          const tabs = tabManager?.list() ?? []
          const activeIdx = tabs.findIndex(t => t.id === tabManager?.getActiveId())
          const nextTab = tabs[activeIdx + 1] || tabs[activeIdx - 1]
          if (nextTab) tabManager?.split(nextTab.id)
        }
      }},
      { type: 'separator' },
      { label: 'Extensions', click: () => tabManager?.create('https://hitroo.com/extensions') },
      { label: 'Settings', click: () => {
        const id = tabManager?.getActiveId()
        if (id) tabManager?.navigate(id, 'silver://settings')
      }},
    ])
    menu.popup({ window: mainWindow! })
  })

  // Helper: send IPC to ghost panel view
  function ghostSend(channel: string, ...args: any[]) {
    ghostView?.webContents.send(channel, ...args)
  }

  // Ghost agent IPC — works on the current active tab
  ipcMain.handle(IPC.GHOST_RUN, async (_, task: string) => {
    const apiKey = settings.get('ghost.apiKey') as string
    if (!apiKey) {
      ghostSend(IPC.GHOST_RESULT, {
        success: false,
        summary: 'No API key configured. Open Ghost settings to add your OpenRouter API key.',
        steps: [],
      })
      return
    }

    if (ghostAgent) {
      ghostSend(IPC.GHOST_RESULT, {
        success: false, summary: 'Ghost is already running. Stop it first.', steps: [],
      })
      return
    }

    const activeId = tabManager?.getActiveId()
    const wc = activeId ? tabManager?.getWebContents(activeId) : null
    if (!wc) {
      ghostSend(IPC.GHOST_RESULT, {
        success: false, summary: 'No active tab to work on.', steps: [],
      })
      return
    }

    const model = (settings.get('ghost.model') as string) || 'anthropic/claude-sonnet-4'
    const provider = new OpenRouterProvider(apiKey, model)
    const llm = new LLMClient(provider)

    const ghostMaxSteps = (settings.get('ghost.maxSteps') as number) || 50

    ghostAgent = new GhostAgent(llm, {
      onStep: (step) => ghostSend(IPC.GHOST_STEP, step),
      onThinking: (text) => ghostSend(IPC.GHOST_STREAM, text),
      onComplete: (success, summary, steps) => {
        ghostSend(IPC.GHOST_RESULT, { success, summary, steps })
        ghostAgent = null
      },
    }, { maxSteps: ghostMaxSteps })

    ghostAgent.run(task, wc)
  })

  ipcMain.handle(IPC.GHOST_STOP, () => {
    ghostAgent?.stop()
    ghostAgent = null
  })

  ipcMain.handle(IPC.GHOST_STATUS, () => ({
    running: ghostAgent !== null,
  }))

  // Ghost Chat — page-aware conversational mode (injects current page as context)
  ipcMain.handle(IPC.GHOST_CHAT, async (_, messages: any[]) => {
    const apiKey = settings.get('ghost.apiKey') as string
    if (!apiKey) return { content: 'No API key configured. Go to Ghost settings to add your OpenRouter API key.', error: true }

    // Inject current page content as context
    const activeId = tabManager?.getActiveId()
    const wc = activeId ? tabManager?.getWebContents(activeId) : null
    let pageContext = ''
    if (wc) {
      try {
        const title = await wc.executeJavaScript(`document.title`)
        const url = wc.getURL()
        const text = await wc.executeJavaScript(`document.body.innerText.substring(0, 6000)`)
        pageContext = `\n\nThe user is currently viewing this page:\nTitle: ${title}\nURL: ${url}\nContent:\n${text}`
      } catch {}
    }

    // Inject page context into system message
    const llmMessages = messages.map((m: any, i: number) => {
      if (i === 0 && m.role === 'system' && pageContext) {
        return { ...m, content: m.content + pageContext }
      }
      return m
    })

    const model = (settings.get('ghost.model') as string) || 'anthropic/claude-sonnet-4'
    const provider = new OpenRouterProvider(apiKey, model)
    const llm = new LLMClient(provider)
    try {
      const response = await llm.chat(llmMessages)
      return { content: response.content, error: false }
    } catch (err: any) {
      return { content: `Error: ${err.message}`, error: true }
    }
  })

  // Window controls
  ipcMain.on(IPC.WINDOW_MINIMIZE, () => mainWindow?.minimize())
  ipcMain.on(IPC.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on(IPC.WINDOW_CLOSE, () => mainWindow?.close())

  // --- Downloads ---
  const downloads: Array<{ url: string; filename: string; state: string; received: number; total: number }> = []

  session.defaultSession.on('will-download', (_event, item) => {
    const entry = {
      url: item.getURL(),
      filename: item.getFilename(),
      state: 'progressing',
      received: 0,
      total: item.getTotalBytes(),
    }
    downloads.push(entry)
    uiView?.webContents.send('silver:download-started', entry)

    item.on('updated', (_, state) => {
      entry.state = state
      entry.received = item.getReceivedBytes()
      entry.total = item.getTotalBytes()
      uiView?.webContents.send('silver:download-progress', entry)
    })

    item.once('done', (_, state) => {
      entry.state = state
      entry.received = item.getTotalBytes()
      uiView?.webContents.send('silver:download-done', entry)
    })
  })

  ipcMain.handle('silver:downloads:list', () => downloads)

  // --- Context menu on tab webContents ---
  const setupContextMenu = (wc: Electron.WebContents) => {
    wc.on('context-menu', (_event, params) => {
      const menu = new Menu()

      if (params.linkURL) {
        menu.append(new MenuItem({
          label: 'Open Link in New Tab',
          click: () => tabManager?.create(params.linkURL),
        }))
        menu.append(new MenuItem({
          label: 'Copy Link Address',
          click: () => { require('electron').clipboard.writeText(params.linkURL) },
        }))
        menu.append(new MenuItem({ type: 'separator' }))
      }

      if (params.hasImageContents) {
        menu.append(new MenuItem({
          label: 'Save Image As...',
          click: () => {
            const result = dialog.showSaveDialogSync(mainWindow!, { defaultPath: params.suggestedFilename || 'image.png' })
            if (result) {
              const https = require('https')
              const fs = require('fs')
              const url = params.srcURL
              const file = fs.createWriteStream(result)
              https.get(url, (res: any) => res.pipe(file))
            }
          },
        }))
        menu.append(new MenuItem({
          label: 'Copy Image Address',
          click: () => { require('electron').clipboard.writeText(params.srcURL) },
        }))
        menu.append(new MenuItem({ type: 'separator' }))
      }

      if (params.selectionText) {
        menu.append(new MenuItem({ label: 'Copy', role: 'copy' }))
        menu.append(new MenuItem({
          label: `Search Google for "${params.selectionText.slice(0, 30)}"`,
          click: () => tabManager?.create(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`),
        }))
        menu.append(new MenuItem({ type: 'separator' }))
      }

      if (params.isEditable) {
        menu.append(new MenuItem({ label: 'Cut', role: 'cut' }))
        menu.append(new MenuItem({ label: 'Copy', role: 'copy' }))
        menu.append(new MenuItem({ label: 'Paste', role: 'paste' }))
        menu.append(new MenuItem({ type: 'separator' }))
      }

      menu.append(new MenuItem({ label: 'Back', enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() }))
      menu.append(new MenuItem({ label: 'Forward', enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() }))
      menu.append(new MenuItem({ label: 'Reload', click: () => wc.reload() }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ label: 'Inspect Element', click: () => wc.inspectElement(params.x, params.y) }))

      menu.popup()
    })
  }

  // --- Permissions — shown as inline bar in the UI, not a blocking dialog ---
  let permissionId = 0
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const autoAllow = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock']
    if (autoAllow.includes(permission)) { callback(true); return }

    // Send to renderer as inline permission bar
    const id = ++permissionId
    uiView?.webContents.send('silver:permission-request', { id, permission })

    // Wait for response from renderer
    const handler = (_: any, response: { id: number; allowed: boolean }) => {
      if (response.id === id) {
        ipcMain.removeListener('silver:permission-response', handler)
        callback(response.allowed)
      }
    }
    ipcMain.on('silver:permission-response', handler)

    // Auto-deny after 30s if no response
    setTimeout(() => {
      ipcMain.removeListener('silver:permission-response', handler)
      callback(false)
    }, 30000)
  })

  // --- Closed tabs stack (for Cmd+Shift+T) ---
  const closedTabs: string[] = []

  // --- Keyboard shortcuts ---
  const registerShortcuts = () => {
    // Tab management
    globalShortcut.register('CommandOrControl+T', () => {
      tabManager?.create()
      uiView?.webContents.send('silver:focus-addressbar')
    })
    globalShortcut.register('CommandOrControl+W', () => {
      const id = tabManager?.getActiveId()
      if (id) {
        const wc = tabManager?.getWebContents(id)
        const url = wc?.getURL()
        if (url && url !== 'about:blank') closedTabs.push(url)
        tabManager?.close(id)
      }
    })
    globalShortcut.register('CommandOrControl+Shift+T', () => {
      const url = closedTabs.pop()
      if (url) tabManager?.create(url)
    })
    globalShortcut.register('CommandOrControl+N', () => {
      createWindow()
    })
    globalShortcut.register('CommandOrControl+Shift+N', () => {
      tabManager?.createIncognito()
      uiView?.webContents.send('silver:focus-addressbar')
    })

    // Navigation
    globalShortcut.register('CommandOrControl+L', () => {
      uiView?.webContents.send('silver:focus-addressbar')
    })
    globalShortcut.register('CommandOrControl+R', () => {
      const id = tabManager?.getActiveId()
      if (id) tabManager?.reload(id)
    })

    // Find in page
    globalShortcut.register('CommandOrControl+F', () => {
      uiView?.webContents.send('silver:find-in-page')
    })

    // Ghost
    globalShortcut.register('CommandOrControl+K', () => setGhostOpen(!ghostPanelOpen))

    // DevTools
    globalShortcut.register('CommandOrControl+Alt+I', () => {
      const id = tabManager?.getActiveId()
      const wc = id ? tabManager?.getWebContents(id) : null
      if (wc) wc.toggleDevTools()
    })

    // Zoom
    globalShortcut.register('CommandOrControl+=', () => {
      const id = tabManager?.getActiveId()
      const wc = id ? tabManager?.getWebContents(id) : null
      if (wc) wc.setZoomLevel(wc.getZoomLevel() + 0.5)
    })
    globalShortcut.register('CommandOrControl+-', () => {
      const id = tabManager?.getActiveId()
      const wc = id ? tabManager?.getWebContents(id) : null
      if (wc) wc.setZoomLevel(wc.getZoomLevel() - 0.5)
    })
    globalShortcut.register('CommandOrControl+0', () => {
      const id = tabManager?.getActiveId()
      const wc = id ? tabManager?.getWebContents(id) : null
      if (wc) wc.setZoomLevel(0)
    })

    // Print
    globalShortcut.register('CommandOrControl+P', () => {
      const id = tabManager?.getActiveId()
      const wc = id ? tabManager?.getWebContents(id) : null
      if (wc) wc.print()
    })

    // Fullscreen
    globalShortcut.register('CommandOrControl+Shift+F', () => {
      mainWindow?.setFullScreen(!mainWindow.isFullScreen())
    })

    // Tab switching by number
    for (let i = 1; i <= 9; i++) {
      globalShortcut.register(`CommandOrControl+${i}`, () => {
        const tabs = tabManager?.list() ?? []
        const idx = i === 9 ? tabs.length - 1 : i - 1
        if (tabs[idx]) tabManager?.switchTo(tabs[idx].id)
      })
    }
  }

  mainWindow.on('resize', updateLayout)
  mainWindow.on('maximize', updateLayout)
  mainWindow.on('unmaximize', updateLayout)

  if (process.env.ELECTRON_RENDERER_URL) {
    uiView.webContents.loadURL(process.env.ELECTRON_RENDERER_URL)
    ghostView!.webContents.loadURL(process.env.ELECTRON_RENDERER_URL + '#ghost')
  } else {
    uiView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
    ghostView!.webContents.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'ghost' })
  }

  uiView.webContents.once('did-finish-load', () => {
    updateLayout()
    // Always start fresh with NTP
    tabManager?.create()
  })

  updateLayout()
  registerShortcuts()

  mainWindow.on('closed', () => {
    mainWindow = null
    globalShortcut.unregisterAll()
  })
}

app.whenReady().then(async () => {
  // Wait for Widevine CDM to install (castLabs Electron)
  try {
    const { components } = require('electron')
    if (components?.whenReady) {
      await components.whenReady()
      console.log('[Silver] Widevine CDM ready:', components.status())
    }
  } catch (e) {
    console.log('[Silver] Components API not available (standard Electron)')
  }
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})
