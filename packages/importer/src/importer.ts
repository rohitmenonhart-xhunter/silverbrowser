import { readFileSync, existsSync, copyFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir, homedir } from 'os'
import { execSync } from 'child_process'
import { getBrowserPaths } from './detect'
import type { Bookmark, HistoryEntry, ImportResult } from './types'

export class BrowserImporter {
  /**
   * Import bookmarks + history from a browser.
   * Chromium-based browsers (Chrome, Brave, Edge, Arc) use the same JSON + SQLite format.
   * Safari uses plist. Firefox uses SQLite in a profile folder.
   */
  import(browserId: string): ImportResult {
    try {
      const paths = getBrowserPaths(browserId)
      if (!paths) return { browser: browserId, bookmarks: [], history: [], success: false, error: 'Unknown browser' }

      if (browserId === 'safari') {
        return this.importSafari()
      }
      if (browserId === 'firefox') {
        return this.importFirefox()
      }

      // Chromium-based
      const bookmarks = this.readChromiumBookmarks(paths.bookmarks)
      const history = this.readChromiumHistory(paths.history)

      return { browser: browserId, bookmarks, history, success: true }
    } catch (err: any) {
      return { browser: browserId, bookmarks: [], history: [], success: false, error: err.message }
    }
  }

  private readChromiumBookmarks(path: string): Bookmark[] {
    if (!existsSync(path)) return []

    const data = JSON.parse(readFileSync(path, 'utf-8'))
    const bookmarks: Bookmark[] = []

    const walk = (node: any, folder: string) => {
      if (!node) return
      if (node.type === 'url') {
        bookmarks.push({
          title: node.name || '',
          url: node.url || '',
          folder,
          dateAdded: node.date_added ? chromiumTimeToUnix(node.date_added) : undefined,
        })
      }
      if (node.children) {
        const folderName = node.name && node.name !== 'bookmark_bar' ? node.name : folder
        for (const child of node.children) {
          walk(child, folderName)
        }
      }
    }

    if (data.roots) {
      walk(data.roots.bookmark_bar, 'Bookmarks Bar')
      walk(data.roots.other, 'Other Bookmarks')
      walk(data.roots.synced, 'Mobile Bookmarks')
    }

    return bookmarks
  }

  private readChromiumHistory(path: string): HistoryEntry[] {
    if (!existsSync(path)) return []

    // SQLite History DB is locked while browser is open — copy to temp
    const tmpPath = join(tmpdir(), `silver-import-history-${Date.now()}.db`)
    try {
      copyFileSync(path, tmpPath)
    } catch {
      return [] // Browser might be locking the file
    }

    try {
      // Use sqlite3 CLI (available on macOS by default)
      const output = execSync(
        `sqlite3 "${tmpPath}" "SELECT url, title, visit_count, last_visit_time FROM urls ORDER BY visit_count DESC LIMIT 200"`,
        { encoding: 'utf-8', timeout: 5000 },
      )

      const entries: HistoryEntry[] = []
      for (const line of output.split('\n')) {
        if (!line.trim()) continue
        const parts = line.split('|')
        if (parts.length < 4) continue
        entries.push({
          url: parts[0],
          title: parts[1] || parts[0],
          visitCount: parseInt(parts[2]) || 1,
          lastVisit: chromiumTimeToUnix(parts[3]),
        })
      }

      return entries
    } catch {
      return []
    } finally {
      try { require('fs').unlinkSync(tmpPath) } catch {}
    }
  }

  private importSafari(): ImportResult {
    const plistPath = join(homedir(), 'Library', 'Safari', 'Bookmarks.plist')
    if (!existsSync(plistPath)) {
      return { browser: 'safari', bookmarks: [], history: [], success: false, error: 'Safari bookmarks not found' }
    }

    try {
      // Convert plist to JSON using plutil (macOS built-in)
      const json = execSync(`plutil -convert json -o - "${plistPath}"`, { encoding: 'utf-8', timeout: 5000 })
      const data = JSON.parse(json)
      const bookmarks: Bookmark[] = []

      const walk = (node: any, folder: string) => {
        if (!node) return
        if (node.URLString) {
          bookmarks.push({
            title: node.URIDictionary?.title || node.Title || '',
            url: node.URLString,
            folder,
          })
        }
        if (node.Children) {
          const f = node.Title || folder
          for (const child of node.Children) {
            walk(child, f)
          }
        }
      }

      walk(data, 'Safari')
      return { browser: 'safari', bookmarks, history: [], success: true }
    } catch (err: any) {
      return { browser: 'safari', bookmarks: [], history: [], success: false, error: err.message }
    }
  }

  private importFirefox(): ImportResult {
    const profilesDir = join(homedir(), 'Library', 'Application Support', 'Firefox', 'Profiles')
    if (!existsSync(profilesDir)) {
      return { browser: 'firefox', bookmarks: [], history: [], success: false, error: 'Firefox profiles not found' }
    }

    // Find the default profile
    const profiles = readdirSync(profilesDir).filter((d) => d.endsWith('.default-release') || d.endsWith('.default'))
    if (profiles.length === 0) {
      return { browser: 'firefox', bookmarks: [], history: [], success: false, error: 'No Firefox profile found' }
    }

    const profilePath = join(profilesDir, profiles[0])
    const placesDb = join(profilePath, 'places.sqlite')
    if (!existsSync(placesDb)) {
      return { browser: 'firefox', bookmarks: [], history: [], success: false, error: 'Firefox places.sqlite not found' }
    }

    const tmpPath = join(tmpdir(), `silver-import-firefox-${Date.now()}.db`)
    try {
      copyFileSync(placesDb, tmpPath)
    } catch {
      return { browser: 'firefox', bookmarks: [], history: [], success: false, error: 'Cannot copy Firefox database (browser may be open)' }
    }

    try {
      // Bookmarks
      const bmOutput = execSync(
        `sqlite3 "${tmpPath}" "SELECT b.title, p.url FROM moz_bookmarks b JOIN moz_places p ON b.fk = p.id WHERE b.type = 1 AND p.url NOT LIKE 'place:%' LIMIT 500"`,
        { encoding: 'utf-8', timeout: 5000 },
      )
      const bookmarks: Bookmark[] = bmOutput.split('\n').filter(Boolean).map((line) => {
        const [title, url] = line.split('|')
        return { title: title || url, url, folder: 'Firefox' }
      })

      // History
      const histOutput = execSync(
        `sqlite3 "${tmpPath}" "SELECT url, title, visit_count, last_visit_date FROM moz_places WHERE visit_count > 0 ORDER BY visit_count DESC LIMIT 200"`,
        { encoding: 'utf-8', timeout: 5000 },
      )
      const history: HistoryEntry[] = histOutput.split('\n').filter(Boolean).map((line) => {
        const parts = line.split('|')
        return {
          url: parts[0],
          title: parts[1] || parts[0],
          visitCount: parseInt(parts[2]) || 1,
          lastVisit: parts[3] ? Math.floor(parseInt(parts[3]) / 1000000) : Date.now(),
        }
      })

      return { browser: 'firefox', bookmarks, history, success: true }
    } catch (err: any) {
      return { browser: 'firefox', bookmarks: [], history: [], success: false, error: err.message }
    } finally {
      try { require('fs').unlinkSync(tmpPath) } catch {}
    }
  }
}

/** Convert Chromium's microsecond timestamp (since 1601) to Unix ms */
function chromiumTimeToUnix(chromeTime: string | number): number {
  const t = typeof chromeTime === 'string' ? parseInt(chromeTime) : chromeTime
  // Chromium stores time as microseconds since 1601-01-01
  return Math.floor((t / 1000) - 11644473600000)
}
