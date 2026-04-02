import { session, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { homedir } from 'os'

const EXTENSIONS_DIR = join(homedir(), '.silver', 'extensions')

export interface ExtensionInfo {
  id: string
  name: string
  version: string
  description: string
  enabled: boolean
  path: string
}

/**
 * Manages Chrome extensions in Silver Browser.
 * Extensions are stored in ~/.silver/extensions/
 * Each extension is a folder with a manifest.json
 */
export class ExtensionManager {
  private loaded = new Map<string, ExtensionInfo>()

  constructor() {
    if (!existsSync(EXTENSIONS_DIR)) {
      mkdirSync(EXTENSIONS_DIR, { recursive: true })
    }
  }

  /** Load all extensions from the extensions directory */
  async loadAll(ses: typeof session.defaultSession) {
    if (!existsSync(EXTENSIONS_DIR)) return

    const dirs = readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())

    for (const dir of dirs) {
      const extPath = join(EXTENSIONS_DIR, dir.name)
      const manifestPath = join(extPath, 'manifest.json')

      if (!existsSync(manifestPath)) continue

      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        const ext = await ses.loadExtension(extPath, { allowFileAccess: true })

        this.loaded.set(ext.id, {
          id: ext.id,
          name: manifest.name || dir.name,
          version: manifest.version || '0.0.0',
          description: manifest.description || '',
          enabled: true,
          path: extPath,
        })

        console.log(`[Extensions] Loaded: ${manifest.name} v${manifest.version}`)
      } catch (err: any) {
        console.error(`[Extensions] Failed to load ${dir.name}:`, err.message)
      }
    }
  }

  /** Install an extension from a CRX file or unpacked directory */
  async installFromPath(extPath: string, ses: typeof session.defaultSession): Promise<ExtensionInfo | null> {
    try {
      const ext = await ses.loadExtension(extPath, { allowFileAccess: true })
      const manifestPath = join(extPath, 'manifest.json')
      let manifest = { name: 'Unknown', version: '0.0.0', description: '' }

      if (existsSync(manifestPath)) {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      }

      const info: ExtensionInfo = {
        id: ext.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        enabled: true,
        path: extPath,
      }

      this.loaded.set(ext.id, info)
      return info
    } catch (err: any) {
      console.error('[Extensions] Install failed:', err.message)
      return null
    }
  }

  /** Remove an extension */
  async remove(id: string, ses: typeof session.defaultSession) {
    try {
      await ses.removeExtension(id)
      this.loaded.delete(id)
    } catch (err: any) {
      console.error('[Extensions] Remove failed:', err.message)
    }
  }

  /** List all loaded extensions */
  list(): ExtensionInfo[] {
    return Array.from(this.loaded.values())
  }

  /** Get the extensions directory path */
  getExtensionsDir(): string {
    return EXTENSIONS_DIR
  }
}
