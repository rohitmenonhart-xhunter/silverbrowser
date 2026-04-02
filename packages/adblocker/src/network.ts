import type { Session, WebContents } from 'electron'

// Blocked ad/tracker domains (top patterns)
const BLOCKED_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
  'adservice.google.com', 'pagead2.googlesyndication.com',
  'facebook.com/tr', 'connect.facebook.net/en_US/fbevents',
  'ad.doubleclick.net', 'stats.g.doubleclick.net',
  'adnxs.com', 'adsrvr.org', 'adform.net', 'admob.com',
  'taboola.com', 'outbrain.com', 'criteo.com', 'criteo.net',
  'amazon-adsystem.com', 'aax.amazon.com',
  'moatads.com', 'serving-sys.com', 'bidswitch.net',
  'rubiconproject.com', 'pubmatic.com', 'openx.net',
  'casalemedia.com', 'sharethrough.com', 'triplelift.com',
  'indexww.com', 'smartadserver.com', 'advertising.com',
  'scorecardresearch.com', 'quantserve.com', 'bluekai.com',
  'demdex.net', 'krxd.net', 'exelator.com',
  'hotjar.com', 'fullstory.com', 'mouseflow.com',
  'cdn.mxpnl.com', 'mixpanel.com',
  'tiktokcdn.com/webcast/tiktoklive',
  'ads-twitter.com', 'ads.linkedin.com',
  'track.hubspot.com', 'bat.bing.com',
  'pixel.facebook.com', 'pixel.quantserve.com',
  'sb.scorecardresearch.com',
  'securepubads.g.doubleclick.net',
  'tpc.googlesyndication.com',
  'www.googletagservices.com',
  'static.ads-twitter.com',
  'analytics.tiktok.com',
]

// URL patterns to block
const BLOCKED_PATTERNS = [
  '/ads/', '/ad/', '/_ads/', '/adserver/',
  '/doubleclick/', '/pagead/', '/adsense/',
  '/tracking/', '/tracker/', '/pixel/',
  '/analytics.js', '/ga.js', '/gtm.js',
  'prebid', 'amazon-adsystem',
  // YouTube-specific ad patterns
  '/get_midroll_info',
  '/api/stats/ads',
  '/ptracking',
  '/youtubei/v1/log_event',
  'youtube.com/pagead/',
  '/generate_204',
]

// YouTube-specific ad domains (supplement the global list)
const YOUTUBE_AD_DOMAINS = [
  'yt3.ggpht.com/an_webp',
  'www.youtube.com/api/stats/ads',
  'www.youtube.com/pagead/',
  'www.youtube.com/ptracking',
]

// Hotstar/Disney+ — only block the ad CDN, nothing else
const HOTSTAR_AD_DOMAINS = [
  'hesads.akamaized.net',
]

const HOTSTAR_AD_PATTERNS: string[] = []

export class SilverBlocker {
  private enabled = true
  private totalBlocked = 0
  private sessionBlocked = 0
  private whitelist = new Set<string>()

  // Domains that should never be blocked (Google services that break sites)
  private neverBlock = new Set([
    'chromewebstore.google.com',
    'chrome.google.com',
    'accounts.google.com',
    'apis.google.com',
    'play.google.com',
    'mail.google.com',
    'drive.google.com',
    'docs.google.com',
  ])

  async initialize(session: Session) {
    session.webRequest.onBeforeRequest((details, callback) => {
      if (!this.enabled) {
        callback({ cancel: false })
        return
      }

      const url = details.url
      let hostname = ''
      try { hostname = new URL(url).hostname } catch { callback({ cancel: false }); return }

      // Whitelist check
      if (this.whitelist.has(hostname)) {
        callback({ cancel: false })
        return
      }

      // Never block requests from whitelisted Google services
      // (Chrome Web Store, Gmail, Google Drive need GTM/analytics to function)
      const initiator = (details as any).initiator || (details as any).referrer || ''
      try {
        if (initiator) {
          const initHost = new URL(initiator).hostname
          if (this.neverBlock.has(initHost)) {
            callback({ cancel: false })
            return
          }
        }
      } catch {}

      // Domain match + URL pattern match + platform-specific
      const blocked = BLOCKED_DOMAINS.some((d) => hostname.includes(d)) ||
        BLOCKED_PATTERNS.some((p) => url.includes(p)) ||
        YOUTUBE_AD_DOMAINS.some((d) => url.includes(d)) ||
        HOTSTAR_AD_DOMAINS.some((d) => hostname.includes(d)) ||
        HOTSTAR_AD_PATTERNS.some((p) => url.includes(p))

      if (blocked) {
        this.totalBlocked++
        this.sessionBlocked++
      }

      callback({ cancel: blocked })
    })
  }

  getStats() {
    return {
      totalBlocked: this.totalBlocked,
      sessionBlocked: this.sessionBlocked,
    }
  }

  toggle(enabled: boolean) {
    this.enabled = enabled
  }

  addWhitelist(domain: string) {
    this.whitelist.add(domain)
  }

  removeWhitelist(domain: string) {
    this.whitelist.delete(domain)
  }
}
