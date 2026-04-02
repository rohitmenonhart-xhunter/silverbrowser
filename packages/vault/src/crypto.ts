import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const VAULT_DIR = join(homedir(), '.silver', '.vault')  // dot-prefixed = hidden
const KEY_FILE = join(VAULT_DIR, '.key')                  // machine key
const ALGORITHM = 'aes-256-gcm'

export class Crypto {
  private key: Buffer

  constructor() {
    this.key = this.getOrCreateKey()
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()
    // Format: iv:tag:encrypted
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':')
    if (parts.length !== 3) throw new Error('Invalid encrypted data')
    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(tag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  encryptBuffer(data: Buffer): Buffer {
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
    const tag = cipher.getAuthTag()
    // Format: [16 iv][16 tag][encrypted data]
    return Buffer.concat([iv, tag, encrypted])
  }

  decryptBuffer(data: Buffer): Buffer {
    const iv = data.subarray(0, 16)
    const tag = data.subarray(16, 32)
    const encrypted = data.subarray(32)
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  }

  private getOrCreateKey(): Buffer {
    if (!existsSync(VAULT_DIR)) {
      mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 })
    }

    if (existsSync(KEY_FILE)) {
      const salt = readFileSync(KEY_FILE)
      return scryptSync(this.getMachineId(), salt, 32)
    }

    // Generate new salt
    const salt = randomBytes(32)
    writeFileSync(KEY_FILE, salt, { mode: 0o600 })
    return scryptSync(this.getMachineId(), salt, 32)
  }

  private getMachineId(): string {
    // Use a combination of machine-specific values as the base secret
    const os = require('os')
    const parts = [
      os.hostname(),
      os.userInfo().username,
      os.cpus()[0]?.model || 'unknown',
      'silver-vault-v1',
    ]
    return parts.join(':')
  }
}
