import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const VAULT_DIR = join(homedir(), '.silver', '.vault')
const PIN_FILE = join(VAULT_DIR, '.pin')

export class VaultAuth {
  /** Check if a PIN has been set up */
  hasPIN(): boolean {
    return existsSync(PIN_FILE)
  }

  /** Set up a new PIN */
  setupPIN(pin: string) {
    if (!existsSync(VAULT_DIR)) mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 })
    const salt = randomBytes(32)
    const hash = scryptSync(pin, salt, 64)
    // Store salt + hash
    const data = Buffer.concat([salt, hash])
    writeFileSync(PIN_FILE, data, { mode: 0o600 })
  }

  /** Verify a PIN */
  verifyPIN(pin: string): boolean {
    if (!existsSync(PIN_FILE)) return false
    const data = readFileSync(PIN_FILE)
    const salt = data.subarray(0, 32)
    const storedHash = data.subarray(32)
    const hash = scryptSync(pin, salt, 64)
    return timingSafeEqual(hash, storedHash)
  }
}
