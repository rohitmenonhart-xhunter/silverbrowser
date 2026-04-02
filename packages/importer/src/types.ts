export interface BrowserInfo {
  id: string
  name: string
  icon: string
  available: boolean
  profiles: string[]
}

export interface Bookmark {
  title: string
  url: string
  folder?: string
  dateAdded?: number
}

export interface HistoryEntry {
  title: string
  url: string
  visitCount: number
  lastVisit: number
}

export interface ImportResult {
  browser: string
  bookmarks: Bookmark[]
  history: HistoryEntry[]
  success: boolean
  error?: string
}
