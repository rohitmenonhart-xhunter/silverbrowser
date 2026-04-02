import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { BrowserInfo } from './types'

const HOME = homedir()
const APP_SUPPORT = join(HOME, 'Library', 'Application Support')

const BROWSERS: Array<{
  id: string
  name: string
  icon: string
  paths: { bookmarks: string; history: string }
}> = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    icon: '🌐',
    paths: {
      bookmarks: join(APP_SUPPORT, 'Google', 'Chrome', 'Default', 'Bookmarks'),
      history: join(APP_SUPPORT, 'Google', 'Chrome', 'Default', 'History'),
    },
  },
  {
    id: 'brave',
    name: 'Brave',
    icon: '🦁',
    paths: {
      bookmarks: join(APP_SUPPORT, 'BraveSoftware', 'Brave-Browser', 'Default', 'Bookmarks'),
      history: join(APP_SUPPORT, 'BraveSoftware', 'Brave-Browser', 'Default', 'History'),
    },
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    icon: '🔷',
    paths: {
      bookmarks: join(APP_SUPPORT, 'Microsoft Edge', 'Default', 'Bookmarks'),
      history: join(APP_SUPPORT, 'Microsoft Edge', 'Default', 'History'),
    },
  },
  {
    id: 'arc',
    name: 'Arc',
    icon: '🌈',
    paths: {
      bookmarks: join(APP_SUPPORT, 'Arc', 'User Data', 'Default', 'Bookmarks'),
      history: join(APP_SUPPORT, 'Arc', 'User Data', 'Default', 'History'),
    },
  },
  {
    id: 'safari',
    name: 'Safari',
    icon: '🧭',
    paths: {
      bookmarks: join(HOME, 'Library', 'Safari', 'Bookmarks.plist'),
      history: join(HOME, 'Library', 'Safari', 'History.db'),
    },
  },
  {
    id: 'firefox',
    name: 'Firefox',
    icon: '🦊',
    paths: {
      bookmarks: join(APP_SUPPORT, 'Firefox', 'Profiles'),
      history: join(APP_SUPPORT, 'Firefox', 'Profiles'),
    },
  },
]

export function detectBrowsers(): BrowserInfo[] {
  return BROWSERS.map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    available: existsSync(b.paths.bookmarks) || existsSync(b.paths.history),
    profiles: ['Default'],
  }))
}

export function getBrowserPaths(browserId: string) {
  return BROWSERS.find((b) => b.id === browserId)?.paths
}
