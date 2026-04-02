import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const SILVER_DIR = join(homedir(), '.silver')
const SETTINGS_FILE = join(SILVER_DIR, 'settings.json')

export class SettingsStore {
  private data: Record<string, unknown> = {}
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.load()
  }

  get(key?: string): unknown {
    if (key) return this.data[key]
    return { ...this.data }
  }

  set(key: string, value: unknown) {
    this.data[key] = value
    this.scheduleSave()
  }

  private load() {
    try {
      if (existsSync(SETTINGS_FILE)) {
        const raw = readFileSync(SETTINGS_FILE, 'utf-8')
        this.data = JSON.parse(raw)
      }
    } catch {
      this.data = {}
    }

    // Defaults
    if (!this.data['ghost.model']) this.data['ghost.model'] = 'anthropic/claude-sonnet-4'
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.saveToDisk(), 300)
  }

  private saveToDisk() {
    try {
      if (!existsSync(SILVER_DIR)) mkdirSync(SILVER_DIR, { recursive: true })
      writeFileSync(SETTINGS_FILE, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[Silver] Failed to save settings:', err)
    }
  }
}
