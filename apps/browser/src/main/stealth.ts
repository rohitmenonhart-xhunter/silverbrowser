import type { WebContents, Session } from 'electron'

/**
 * Stealth script — makes Electron look like real Chrome.
 * Injects fake navigator.plugins, window.chrome, etc.
 * Must run before any page JS.
 */
const STEALTH_SCRIPT = `
(function silverStealth() {
  if (window.__silverStealth) return;
  window.__silverStealth = true;

  // 1. Fake navigator.plugins (Chrome has these)
  var fakePlugins = {
    0: { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1, 0: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' } },
    1: { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 1, 0: { type: 'application/pdf', suffixes: 'pdf', description: '' } },
    2: { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 1, 0: { type: 'application/pdf', suffixes: 'pdf', description: '' } },
    3: { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 1, 0: { type: 'application/pdf', suffixes: 'pdf', description: '' } },
    4: { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: '', length: 1, 0: { type: 'application/pdf', suffixes: 'pdf', description: '' } },
    length: 5,
    item: function(i) { return this[i] || null; },
    namedItem: function(name) { for (var i = 0; i < this.length; i++) { if (this[i].name === name) return this[i]; } return null; },
    refresh: function() {},
    [Symbol.iterator]: function*() { for (var i = 0; i < this.length; i++) yield this[i]; }
  };
  try {
    Object.defineProperty(navigator, 'plugins', { get: function() { return fakePlugins; }, configurable: true });
  } catch(e) {}

  // 2. Fake navigator.mimeTypes
  var fakeMimeTypes = {
    0: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: fakePlugins[0] },
    length: 1,
    item: function(i) { return this[i] || null; },
    namedItem: function(name) { return this[0] && this[0].type === name ? this[0] : null; },
    [Symbol.iterator]: function*() { for (var i = 0; i < this.length; i++) yield this[i]; }
  };
  try {
    Object.defineProperty(navigator, 'mimeTypes', { get: function() { return fakeMimeTypes; }, configurable: true });
  } catch(e) {}

  // 3. Fake window.chrome object (critical for Hotstar/Netflix detection)
  if (!window.chrome) {
    window.chrome = {
      app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
      csi: function() { return {}; },
      loadTimes: function() { return { requestTime: Date.now() / 1000, startLoadTime: Date.now() / 1000, commitLoadTime: Date.now() / 1000, finishDocumentLoadTime: Date.now() / 1000, finishLoadTime: Date.now() / 1000, firstPaintTime: Date.now() / 1000, firstPaintAfterLoadTime: 0, navigationType: 'Other', wasFetchedViaSpdy: true, wasNpnNegotiated: true, npnNegotiatedProtocol: 'h2', wasAlternateProtocolAvailable: false, connectionInfo: 'h2' }; },
      runtime: { OnInstalledReason: {}, OnRestartRequiredReason: {}, PlatformArch: {}, PlatformNaclArch: {}, PlatformOs: {}, RequestUpdateCheckStatus: {}, connect: function() { return { onDisconnect: { addListener: function() {} }, onMessage: { addListener: function() {} }, postMessage: function() {} }; }, sendMessage: function() {} },
    };
  }

  // 4. Fix navigator.webdriver (Electron/automation sets this true)
  try {
    Object.defineProperty(navigator, 'webdriver', { get: function() { return false; }, configurable: true });
  } catch(e) {}

  // 5. Fake navigator.languages (Electron sometimes has empty array)
  try {
    Object.defineProperty(navigator, 'languages', { get: function() { return ['en-US', 'en']; }, configurable: true });
  } catch(e) {}

  // 6. Fix navigator.permissions to look like Chrome
  var origQuery = navigator.permissions && navigator.permissions.query;
  if (origQuery) {
    navigator.permissions.query = function(params) {
      if (params.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return origQuery.call(navigator.permissions, params);
    };
  }

  // 7. Fix WebGL vendor/renderer (Electron sometimes exposes different values)
  var getParam = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return 'Google Inc. (Apple)';  // UNMASKED_VENDOR_WEBGL
    if (param === 37446) return 'ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)';  // UNMASKED_RENDERER_WEBGL
    return getParam.call(this, param);
  };

  // 8. Fake navigator.connection (Chrome has this)
  if (!navigator.connection) {
    Object.defineProperty(navigator, 'connection', {
      get: function() {
        return { effectiveType: '4g', rtt: 50, downlink: 10, saveData: false, onchange: null };
      },
      configurable: true
    });
  }

  // 9. Fake navigator.userAgentData (CRITICAL for Google sign-in)
  // Google checks this to verify Chrome. Electron doesn't have it.
  if (!navigator.userAgentData) {
    Object.defineProperty(navigator, 'userAgentData', {
      get: function() {
        return {
          brands: [
            { brand: 'Chromium', version: '144' },
            { brand: 'Google Chrome', version: '144' },
            { brand: 'Not?A_Brand', version: '99' }
          ],
          mobile: false,
          platform: 'macOS',
          getHighEntropyValues: function(hints) {
            return Promise.resolve({
              brands: [
                { brand: 'Chromium', version: '144' },
                { brand: 'Google Chrome', version: '144' },
                { brand: 'Not?A_Brand', version: '99' }
              ],
              mobile: false,
              platform: 'macOS',
              platformVersion: '15.0.0',
              architecture: 'arm',
              bitness: '64',
              model: '',
              uaFullVersion: '144.0.7559.225',
              fullVersionList: [
                { brand: 'Chromium', version: '144.0.7559.225' },
                { brand: 'Google Chrome', version: '144.0.7559.225' },
                { brand: 'Not?A_Brand', version: '99.0.0.0' }
              ]
            });
          },
          toJSON: function() {
            return {
              brands: this.brands,
              mobile: this.mobile,
              platform: this.platform
            };
          }
        };
      },
      configurable: true
    });
  }

  // 10. Fix Notification.permission for Google
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // Don't override, just ensure it exists
    }
  } catch(e) {}
})();
`

/**
 * Set Chrome client hint headers + Shield privacy headers.
 * SINGLE unified onBeforeSendHeaders handler (Electron only allows one).
 * Pass the SilverShield instance so it can apply privacy headers when enabled.
 */
export function setupStealthHeaders(ses: Session, shield?: any) {
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    let headers = { ...details.requestHeaders }

    // Chrome client hints (always)
    headers['Sec-CH-UA'] = '"Chromium";v="144", "Google Chrome";v="144", "Not?A_Brand";v="99"'
    headers['Sec-CH-UA-Mobile'] = '?0'
    headers['Sec-CH-UA-Platform'] = '"macOS"'
    headers['Sec-CH-UA-Platform-Version'] = '"15.0.0"'
    headers['Sec-CH-UA-Full-Version-List'] = '"Chromium";v="144.0.7559.225", "Google Chrome";v="144.0.7559.225", "Not?A_Brand";v="99.0.0.0"'

    // Remove any Electron-identifying headers
    delete headers['X-Electron-App']

    // Ensure Sec-Fetch headers look like a real browser (not embedded webview)
    if (details.url.includes('accounts.google.com') || details.url.includes('googleapis.com')) {
      headers['Sec-Fetch-Site'] = headers['Sec-Fetch-Site'] || 'same-origin'
      headers['Sec-Fetch-Mode'] = headers['Sec-Fetch-Mode'] || 'navigate'
      headers['Sec-Fetch-Dest'] = headers['Sec-Fetch-Dest'] || 'document'
    }

    // Shield privacy headers (when enabled)
    if (shield?.isEnabled?.()) {
      headers = shield.getPrivacyHeaders(details, headers)
    }

    callback({ requestHeaders: headers })
  })
}

/**
 * Inject stealth into every tab's webContents.
 * Uses Chrome DevTools Protocol to inject BEFORE any page JS runs.
 * This is the only way to beat Akamai Bot Manager fingerprinting.
 */
export function injectStealth(webContents: WebContents) {
  try {
    webContents.debugger.attach('1.3')
    webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
      source: STEALTH_SCRIPT,
      worldName: '',  // inject into main world, not isolated
    }).catch(() => {})
    // Don't detach — need it persistent across navigations
  } catch {
    // debugger already attached or not available — fall back
    webContents.on('did-start-navigation', (_event, _url, isInPlace) => {
      if (isInPlace) return
      webContents.executeJavaScript(STEALTH_SCRIPT).catch(() => {})
    })
  }

  // Backup: also on dom-ready
  webContents.on('dom-ready', () => {
    webContents.executeJavaScript(STEALTH_SCRIPT).catch(() => {})
  })
}
