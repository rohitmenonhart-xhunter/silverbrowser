import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { randomBytes } from 'crypto'
import { Crypto } from './crypto'
import type { SavedCredential } from './types'

const VAULT_DIR = join(homedir(), '.silver', '.vault')
const PASSWORDS_FILE = join(VAULT_DIR, '.passwords')

export class PasswordManager {
  private crypto: Crypto
  private credentials: SavedCredential[] = []

  constructor(crypto: Crypto) {
    this.crypto = crypto
    this.load()
  }

  /** Save a credential (encrypts the password) */
  save(domain: string, username: string, password: string, url: string): SavedCredential {
    // Check if we already have this domain+username
    const existing = this.credentials.find(
      (c) => c.domain === domain && c.username === username,
    )

    if (existing) {
      existing.password = this.crypto.encrypt(password)
      existing.lastUsed = Date.now()
      existing.url = url
      this.persist()
      return { ...existing, password: '***' }
    }

    const cred: SavedCredential = {
      id: randomBytes(8).toString('hex'),
      domain,
      username,
      password: this.crypto.encrypt(password),
      url,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    }
    this.credentials.push(cred)
    this.persist()
    return { ...cred, password: '***' }
  }

  /** Get credentials for a domain (decrypts passwords) */
  getForDomain(domain: string): Array<{ id: string; username: string; password: string }> {
    return this.credentials
      .filter((c) => c.domain === domain)
      .map((c) => ({
        id: c.id,
        username: c.username,
        password: this.crypto.decrypt(c.password),
      }))
  }

  /** List all saved domains (no passwords) */
  list(): Array<{ id: string; domain: string; username: string; url: string; lastUsed: number }> {
    return this.credentials.map((c) => ({
      id: c.id,
      domain: c.domain,
      username: c.username,
      url: c.url,
      lastUsed: c.lastUsed,
    }))
  }

  /** Delete a credential */
  delete(id: string) {
    this.credentials = this.credentials.filter((c) => c.id !== id)
    this.persist()
  }

  private load() {
    try {
      if (existsSync(PASSWORDS_FILE)) {
        const encrypted = readFileSync(PASSWORDS_FILE, 'utf-8')
        const json = this.crypto.decrypt(encrypted)
        this.credentials = JSON.parse(json)
      }
    } catch (err) {
      console.error('[Vault] Failed to load passwords:', err)
      this.credentials = []
    }
  }

  private persist() {
    try {
      if (!existsSync(VAULT_DIR)) mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 })
      const json = JSON.stringify(this.credentials)
      const encrypted = this.crypto.encrypt(json)
      writeFileSync(PASSWORDS_FILE, encrypted, { mode: 0o600 })
    } catch (err) {
      console.error('[Vault] Failed to save passwords:', err)
    }
  }
}
