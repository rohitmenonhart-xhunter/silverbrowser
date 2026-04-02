import type { Session } from 'electron'
import type { ShieldStatus } from './types'

// Cloudflare DoH endpoints
const DOH_SERVERS = [
  'https://cloudflare-dns.com/dns-query',
  'https://1.1.1.1/dns-query',
  'https://1.0.0.1/dns-query',
]

export class SilverShield {
  private enabled = false
  private currentIp = ''
  private currentLocation = ''

  async enable(ses: Session) {
    this.enabled = true

    // DNS-over-HTTPS via Cloudflare
    // 'automatic' = try DoH first, fall back to system DNS for CDN/deep links
    const { app } = require('electron')
    app.configureHostResolver({
      secureDnsMode: 'automatic',
      secureDnsServers: DOH_SERVERS,
    })

    await this.refreshStatus()
    console.log('[Shield] Enabled — DNS-over-HTTPS via Cloudflare 1.1.1.1')
  }

  disable() {
    this.enabled = false
    const { app } = require('electron')
    app.configureHostResolver({
      secureDnsMode: 'off',
      secureDnsServers: [],
    })
    console.log('[Shield] Disabled')
  }

  toggle() {
    if (this.enabled) {
      this.disable()
    }
    // enable needs session — caller handles that
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Get tracking headers to strip and privacy flags.
   * Called by the stealth module's unified onBeforeSendHeaders handler.
   */
  getPrivacyHeaders(details: { referrer?: string; url: string }, headers: Record<string, string>): Record<string, string> {
    if (!this.enabled) return headers

    // Strip known tracking headers
    delete headers['x-client-data']
    delete headers['x-chrome-uma-enabled']
    delete headers['x-chrome-variations']

    // Trim cross-origin referer (send only origin, not full path)
    if (details.referrer && details.url) {
      try {
        const refOrigin = new URL(details.referrer).origin
        const reqOrigin = new URL(details.url).origin
        if (refOrigin !== reqOrigin) {
          headers['Referer'] = reqOrigin + '/'
        }
      } catch {}
    }

    return headers
  }

  async refreshStatus(): Promise<void> {
    try {
      const resp = await fetch('https://1.1.1.1/cdn-cgi/trace')
      const text = await resp.text()
      for (const line of text.split('\n')) {
        if (line.startsWith('ip=')) this.currentIp = line.slice(3)
        if (line.startsWith('loc=')) this.currentLocation = line.slice(4)
      }
    } catch {}
  }

  async getStatus(): Promise<ShieldStatus> {
    await this.refreshStatus()

    let latency = 0
    try {
      const start = Date.now()
      await fetch('https://1.1.1.1/cdn-cgi/trace', { method: 'HEAD' })
      latency = Date.now() - start
    } catch {}

    return {
      enabled: this.enabled,
      dohEnabled: this.enabled,
      proxyEnabled: false,
      ip: this.currentIp,
      location: this.currentLocation,
      latency,
    }
  }
}
