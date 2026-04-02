import { session, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, createWriteStream } from 'fs'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { ExtensionManager } from './extensions'

const EXTENSIONS_DIR = join(homedir(), '.silver', 'extensions')

/**
 * Intercept Chrome Web Store and enable "Add to Chrome" functionality.
 * When user visits a CWS extension page, we inject a script that:
 * 1. Replaces the greyed-out "Add to Chrome" button with a working one
 * 2. On click, downloads the CRX via Google's update API
 * 3. Extracts and installs it
 */

const CWS_INJECT_SCRIPT = `
(function silverCWSInstaller() {
  if (window.__silverCWS) return;
  window.__silverCWS = true;

  // Only run on Chrome Web Store
  if (!location.hostname.includes('chromewebstore.google.com')) return;

  function getExtensionId() {
    // URL pattern: /detail/extension-name/EXTENSION_ID
    var match = location.pathname.match(/\\/detail\\/[^/]+\\/([a-z]{32})/);
    return match ? match[1] : null;
  }

  function addInstallButton() {
    var id = getExtensionId();
    if (!id) return;

    // Find the "Add to Chrome" button or the unavailable banner
    var btns = document.querySelectorAll('button');
    var targetBtn = null;
    btns.forEach(function(btn) {
      var text = (btn.textContent || '').trim();
      if (text === 'Add to Chrome' || text === 'Remove from Chrome') {
        targetBtn = btn;
      }
    });

    // Hide the "Item currently unavailable" banner
    document.querySelectorAll('div, section').forEach(function(el) {
      var text = (el.textContent || '').trim();
      if (text.includes('Item currently unavailable') && el.children.length < 10) {
        el.style.display = 'none';
      }
    });

    // Also check for the unavailable banner by class
    var banner = document.querySelector('[class*="unavailable"], [class*="Unavailable"], [class*="warning-banner"], [role="alert"]');

    // Create our install button
    var silverBtn = document.getElementById('silver-install-btn');
    if (silverBtn) return; // Already added

    silverBtn = document.createElement('button');
    silverBtn.id = 'silver-install-btn';
    silverBtn.textContent = '+ Add to Silver';
    silverBtn.style.cssText = 'background:#c0c4ce; color:#1a1a1e; border:none; border-radius:24px; padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; margin:8px 0; font-family:-apple-system,system-ui,sans-serif;';
    silverBtn.addEventListener('mouseover', function() { silverBtn.style.background = '#e0e2ea'; });
    silverBtn.addEventListener('mouseout', function() { silverBtn.style.background = '#c0c4ce'; });

    silverBtn.addEventListener('click', function() {
      silverBtn.textContent = 'Installing...';
      silverBtn.disabled = true;
      silverBtn.style.opacity = '0.6';

      // Send extension ID to main process for download + install
      window.postMessage({ type: 'silver-install-extension', extensionId: id }, '*');
    });

    // Insert our button
    if (targetBtn) {
      targetBtn.parentNode.insertBefore(silverBtn, targetBtn);
      targetBtn.style.display = 'none';
    } else if (banner) {
      banner.style.display = 'none';
      banner.parentNode.insertBefore(silverBtn, banner);
    } else {
      // Try to find the action area
      var actionArea = document.querySelector('[class*="header"] [class*="action"], [class*="Header"] [class*="Action"]');
      if (actionArea) {
        actionArea.prepend(silverBtn);
      }
    }
  }

  // Run on page load and on SPA navigation
  addInstallButton();
  new MutationObserver(function() {
    setTimeout(addInstallButton, 500);
  }).observe(document.body, { childList: true, subtree: true });

  // Listen for install success/failure from main process
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'silver-extension-installed') {
      var btn = document.getElementById('silver-install-btn');
      if (btn) {
        btn.textContent = 'Added to Silver ✓';
        btn.style.background = '#6ee7a8';
        btn.style.color = '#1a1a1e';
      }
    }
    if (e.data && e.data.type === 'silver-extension-failed') {
      var btn = document.getElementById('silver-install-btn');
      if (btn) {
        btn.textContent = 'Install Failed — Try Again';
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.background = '#fca5a5';
      }
    }
  });
})();
`

/**
 * Download a CRX from Chrome Web Store and install it.
 * Uses Google's update API: clients2.google.com/service/update2/crx
 */
export async function downloadAndInstallCRX(
  extensionId: string,
  extManager: ExtensionManager,
  mainWindow: BrowserWindow | null,
): Promise<boolean> {
  if (!existsSync(EXTENSIONS_DIR)) mkdirSync(EXTENSIONS_DIR, { recursive: true })

  const extDir = join(EXTENSIONS_DIR, extensionId)

  try {
    // Download CRX from Google's update API
    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=130.0.6723.117&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`

    const crxPath = join(EXTENSIONS_DIR, `${extensionId}.crx`)

    // Download using curl (reliable, handles redirects)
    execSync(`curl -sL -o "${crxPath}" "${crxUrl}"`, { timeout: 30000 })

    if (!existsSync(crxPath)) {
      console.error('[CRX] Download failed — file not created')
      return false
    }

    // Extract CRX (it's a zip with a special header)
    // CRX3 format: magic(4) + version(4) + header_size(4) + header + zip_data
    // We can skip the header and extract the zip part
    if (!existsSync(extDir)) mkdirSync(extDir, { recursive: true })

    // Use Python to strip CRX header and extract zip (more reliable than manual parsing)
    execSync(`python3 -c "
import zipfile, struct, os, sys
with open('${crxPath}', 'rb') as f:
    magic = f.read(4)
    if magic == b'Cr24':  # CRX3
        version = struct.unpack('<I', f.read(4))[0]
        header_size = struct.unpack('<I', f.read(4))[0]
        f.seek(12 + header_size)  # Skip to zip data
    elif magic[:2] == b'PK':  # Already a zip
        f.seek(0)
    else:
        print('Unknown format'); sys.exit(1)
    zip_data = f.read()
    zip_path = '${crxPath}.zip'
    with open(zip_path, 'wb') as zf:
        zf.write(zip_data)
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall('${extDir}')
    os.remove(zip_path)
print('Extracted OK')
"`, { timeout: 15000 })

    // Clean up CRX file
    try { require('fs').unlinkSync(crxPath) } catch {}

    // Verify manifest exists
    if (!existsSync(join(extDir, 'manifest.json'))) {
      console.error('[CRX] No manifest.json found after extraction')
      return false
    }

    // Load the extension
    const result = await extManager.installFromPath(extDir, session.defaultSession)
    if (result) {
      console.log(`[CRX] Installed: ${result.name} v${result.version}`)
      return true
    }

    return false
  } catch (err: any) {
    console.error('[CRX] Install error:', err.message)
    return false
  }
}

/**
 * Inject CWS installer script into Chrome Web Store pages.
 */
export function injectCWSInstaller(webContents: Electron.WebContents) {
  webContents.on('did-finish-load', () => {
    const url = webContents.getURL()
    if (url.includes('chromewebstore.google.com')) {
      webContents.executeJavaScript(CWS_INJECT_SCRIPT).catch(() => {})
    }
  })

  webContents.on('did-navigate-in-page', (_event, url) => {
    if (url.includes('chromewebstore.google.com')) {
      webContents.executeJavaScript(CWS_INJECT_SCRIPT).catch(() => {})
    }
  })
}
