import { session, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Google sign-in via native macOS WKWebView.
 *
 * Flow: User clicks "Sign in to Google" in Silver →
 * native WKWebView opens → user signs in →
 * cookies imported into Electron → all Google services work.
 *
 * No OAuth intercept needed. Just pre-sign-in to Google directly.
 */

const HELPER_PATHS = [
  join(__dirname, '../../src/native/google-auth-helper'),
  join(__dirname, '../../../src/native/google-auth-helper'),
  join(process.cwd(), 'apps/browser/src/native/google-auth-helper'),
]

function getHelperPath(): string | null {
  for (const p of HELPER_PATHS) {
    if (existsSync(p)) return p
  }
  return null
}

export function setupGoogleAuthIPC() {
  ipcMain.handle('silver:google-signin', async () => {
    return launchGoogleSignIn()
  })
}

function launchGoogleSignIn(): Promise<{ success: boolean; cookies: number }> {
  return new Promise((resolve) => {
    const helper = getHelperPath()
    if (!helper) {
      console.error('[GoogleAuth] Native helper not found')
      resolve({ success: false, cookies: 0 })
      return
    }

    console.log('[GoogleAuth] Launching native WKWebView...')

    execFile(helper, [
      'https://accounts.google.com/ServiceLogin?continue=https://myaccount.google.com/',
      'https://myaccount.google.com/',
    ], { timeout: 180000 }, async (err, stdout) => {
      if (err) {
        console.log('[GoogleAuth] Window closed or timeout')
        resolve({ success: false, cookies: 0 })
        return
      }

      const match = stdout.match(/__COOKIES__(.*?)__END__/)
      if (match) {
        try {
          const cookies = JSON.parse(match[1])
          await importCookies(cookies)
          console.log(`[GoogleAuth] Imported ${cookies.length} cookies`)
          resolve({ success: true, cookies: cookies.length })
        } catch (e) {
          console.error('[GoogleAuth] Cookie parse error:', e)
          resolve({ success: false, cookies: 0 })
        }
      } else {
        resolve({ success: false, cookies: 0 })
      }
    })
  })
}

async function importCookies(cookies: Array<{ name: string; value: string; domain: string; path: string; secure: string; httpOnly: string }>) {
  const ses = session.defaultSession
  // Set expiry to 1 year from now so cookies persist across restarts
  const oneYear = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
  for (const c of cookies) {
    try {
      const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain
      await ses.cookies.set({
        url: `http${c.secure === 'true' ? 's' : ''}://${domain}${c.path}`,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure === 'true',
        httpOnly: c.httpOnly === 'true',
        expirationDate: oneYear,
      })
    } catch {}
  }
}
