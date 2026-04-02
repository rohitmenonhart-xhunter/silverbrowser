import type { WebContents } from 'electron'

const COSMETIC_CSS = `
  /* Google ads */
  .ads-ad, .adsbygoogle, ins.adsbygoogle, #google_ads_iframe_0,
  [id^="google_ads"], [id^="div-gpt-ad"], [class*="ad-slot"],
  [class*="ad-banner"], [class*="ad-container"],

  /* Generic ad patterns */
  [class*="sponsored"], [data-ad], [data-ad-slot],
  [aria-label="advertisement"], [aria-label="Sponsored"],
  iframe[src*="doubleclick"], iframe[src*="googlesyndication"],

  /* Cookie consent banners */
  #onetrust-banner-sdk, .cc-banner, #cookie-consent,
  [class*="cookie-banner"], [class*="consent-banner"],
  [id*="cookie-notice"], [class*="cookie-notice"],
  .evidon-banner, #CybotCookiebotDialog,

  /* Newsletter popups */
  [class*="newsletter-popup"], [class*="subscribe-modal"],

  /* Social share floating bars */
  [class*="share-bar-fixed"], [class*="social-share-sticky"]
  {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
  }
`

const YOUTUBE_CSS = `
  /* YouTube video ad overlays */
  .ytp-ad-module,
  .ytp-ad-overlay-container,
  .ytp-ad-player-overlay,
  .ytp-ad-overlay-slot,
  .ytp-ad-image-overlay,
  .video-ads,
  .ytp-ad-badge,
  .ytp-ad-visit-advertiser-button,
  .ytp-ad-button-icon,
  .ytp-ad-text,
  .ytp-ad-preview-container,
  .ytp-ad-skip-button-container,

  /* YouTube page-level ad containers */
  ytd-ad-slot-renderer,
  ytd-banner-promo-renderer,
  ytd-promoted-sparkles-web-renderer,
  ytd-promoted-sparkles-text-search-renderer,
  ytd-promoted-video-renderer,
  ytd-compact-promoted-video-renderer,
  ytd-display-ad-renderer,
  ytd-in-feed-ad-layout-renderer,
  ytd-mealbar-promo-renderer,
  ytd-statement-banner-renderer,
  ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
  #player-ads,
  #masthead-ad,
  #related-ads,
  #search-ads,
  #ad_creative_3,

  /* YouTube Premium upsell */
  tp-yt-paper-dialog.ytd-popup-container,
  ytd-mealbar-promo-renderer,

  /* YouTube Shorts ads */
  ytd-reel-video-renderer[is-ad],

  /* YouTube sidebar promoted */
  #offer-module,
  .ytd-merch-shelf-renderer,

  /* YouTube ad markers on progress bar */
  .ytp-ad-progress-list
  {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
`

export function injectCosmeticFilters(webContents: WebContents) {
  // Global cosmetic filters (all sites)
  webContents.on('did-finish-load', () => {
    webContents.insertCSS(COSMETIC_CSS).catch(() => {})

    // YouTube-specific cosmetic filters
    const url = webContents.getURL()
    if (url.includes('youtube.com')) {
      webContents.insertCSS(YOUTUBE_CSS).catch(() => {})
    }
  })

  // YouTube SPA navigation — re-inject YouTube CSS
  webContents.on('did-navigate-in-page', (_event, url) => {
    if (url.includes('youtube.com')) {
      webContents.insertCSS(YOUTUBE_CSS).catch(() => {})
    }
  })
}
