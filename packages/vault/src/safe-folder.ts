import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { randomBytes } from 'crypto'
import { Crypto } from './crypto'
import type { SafeFile } from './types'

// Hidden deep inside ~/.silver — dot-prefixed, obscure naming
const VAULT_DIR = join(homedir(), '.silver', '.vault')
const SAFE_DIR = join(VAULT_DIR, '.store')        // encrypted files stored here
const INDEX_FILE = join(VAULT_DIR, '.safe-index')  // encrypted file index

export class SafeFolder {
  private crypto: Crypto
  private files: SafeFile[] = []

  constructor(crypto: Crypto) {
    this.crypto = crypto
    this.load()
  }

  /** Add a file to the safe folder (encrypts and stores) */
  addFile(name: string, data: Buffer, mimeType: string): SafeFile {
    const id = randomBytes(16).toString('hex')

    // Encrypt and save with random filename (no trace of original name)
    if (!existsSync(SAFE_DIR)) mkdirSync(SAFE_DIR, { recursive: true, mode: 0o700 })
    const encrypted = this.crypto.encryptBuffer(data)
    writeFileSync(join(SAFE_DIR, id), encrypted, { mode: 0o600 })

    const entry: SafeFile = {
      id,
      name,
      mimeType,
      size: data.length,
      createdAt: Date.now(),
    }
    this.files.push(entry)
    this.persistIndex()
    return entry
  }

  /** Get decrypted file content */
  getFile(id: string): { data: Buffer; file: SafeFile } | null {
    const file = this.files.find((f) => f.id === id)
    if (!file) return null

    const path = join(SAFE_DIR, id)
    if (!existsSync(path)) return null

    const encrypted = readFileSync(path)
    const data = this.crypto.decryptBuffer(encrypted)
    return { data, file }
  }

  /** List all files (metadata only, no content) */
  list(): SafeFile[] {
    return this.files.map((f) => ({ ...f }))
  }

  /** Remove a file */
  removeFile(id: string) {
    const path = join(SAFE_DIR, id)
    if (existsSync(path)) unlinkSync(path)
    this.files = this.files.filter((f) => f.id !== id)
    this.persistIndex()
  }

  private load() {
    try {
      if (existsSync(INDEX_FILE)) {
        const encrypted = readFileSync(INDEX_FILE, 'utf-8')
        const json = this.crypto.decrypt(encrypted)
        this.files = JSON.parse(json)
      }
    } catch (err) {
      console.error('[Vault] Failed to load safe folder:', err)
      this.files = []
    }
  }

  private persistIndex() {
    try {
      if (!existsSync(VAULT_DIR)) mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 })
      const json = JSON.stringify(this.files)
      const encrypted = this.crypto.encrypt(json)
      writeFileSync(INDEX_FILE, encrypted, { mode: 0o600 })
    } catch (err) {
      console.error('[Vault] Failed to save safe folder index:', err)
    }
  }
}
