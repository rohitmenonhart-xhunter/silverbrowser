import type { WebContents } from 'electron'

/**
 * Phase 1: Lightweight interception.
 * Instead of proxying fetch (which breaks the player), we patch the player
 * config AFTER it loads and speed through any ads instantly.
 * Injected early at did-start-navigation.
 */
const EARLY_SCRIPT = `
(function silverYTEarly() {
  if (window.__silverYTEarly) return;
  window.__silverYTEarly = true;

  // Block ad-related beacons silently
  var origBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = function(url) {
    if (typeof url === 'string' &&
        (url.includes('/ptracking') ||
         url.includes('/api/stats/ads') ||
         url.includes('/log_event?'))) {
      return true;
    }
    return origBeacon.apply(null, arguments);
  };

  // Patch ytInitialPlayerResponse to remove ad placements
  // This runs before the player reads it
  try {
    var _orig = window.ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      enumerable: true,
      get: function() { return _orig; },
      set: function(v) {
        if (v && typeof v === 'object') {
          try {
            delete v.adPlacements;
            delete v.playerAds;
            delete v.adSlots;
            delete v.adBreakParams;
            delete v.adBreakHeartbeatParams;
            if (v.playerConfig) delete v.playerConfig.adsRequestUrl;
          } catch(e) {}
        }
        _orig = v;
      }
    });
  } catch(e) {}
})();
`

/**
 * Phase 2: Aggressive DOM-level ad handling.
 * This is the main defense — detects ads and speeds through them instantly.
 * Injected at dom-ready and on SPA navigations.
 */
const DOM_SCRIPT = `
(function silverYTDOM() {
  if (window.__silverYTDOM) return;
  window.__silverYTDOM = true;

  var adWasPlaying = false;
  var userVolume = 1;

  function handleAds() {
    var player = document.querySelector('#movie_player');
    if (!player) return;

    var isAd = player.classList.contains('ad-showing');
    var video = document.querySelector('video');

    if (isAd && video) {
      // Remember user volume before muting
      if (!adWasPlaying) {
        userVolume = video.volume;
        adWasPlaying = true;
      }

      // Mute immediately
      video.volume = 0;

      // ALL of these run every frame — shotgun approach
      // 1. Max playback speed
      video.playbackRate = 16;

      // 2. Seek to end of ad (fires every frame until duration is available)
      if (video.duration && isFinite(video.duration) && video.duration > 0.2) {
        video.currentTime = video.duration - 0.1;
      }

      // 3. Click ANY skip button variant
      var skipBtns = document.querySelectorAll(
        '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, ' +
        '.ytp-ad-skip-button-slot button, [id*="skip-button"] button, ' +
        'button.ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button'
      );
      skipBtns.forEach(function(b) { b.click(); });
    }

    if (!isAd && adWasPlaying) {
      // Ad finished — restore
      adWasPlaying = false;
      if (video) {
        video.volume = userVolume;
        video.playbackRate = 1;
      }
    }

    // Close overlay ads
    var overlayClose = document.querySelector('.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container button');
    if (overlayClose) overlayClose.click();
  }

  function hideAdElements() {
    var sels = [
      '#player-ads',
      '#masthead-ad',
      'ytd-ad-slot-renderer',
      'ytd-banner-promo-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-promoted-sparkles-text-search-renderer',
      'ytd-display-ad-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-promoted-video-renderer',
      'ytd-compact-promoted-video-renderer',
      'ytd-mealbar-promo-renderer',
      'ytd-statement-banner-renderer',
      '#related-ads',
      '#search-ads',
      '#ad_creative_3',
      '#offer-module',
      '.ytd-merch-shelf-renderer',
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]'
    ];

    sels.forEach(function(s) {
      document.querySelectorAll(s).forEach(function(el) {
        el.style.setProperty('display', 'none', 'important');
      });
    });
  }

  // Use requestAnimationFrame for lowest latency
  function loop() {
    handleAds();
    hideAdElements();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // MutationObserver for immediate DOM change response
  new MutationObserver(function() {
    handleAds();
    hideAdElements();
  }).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
})();
`

export function injectYouTubeAdBlocker(webContents: WebContents) {
  // Phase 1: Early injection — patch player config before player reads it
  webContents.on('did-start-navigation', (_event, url, isInPlace) => {
    if (isInPlace) return
    if (url.includes('youtube.com')) {
      webContents.executeJavaScript(EARLY_SCRIPT).catch(() => {})
    }
  })

  // Phase 2: DOM failsafe — after page loads
  webContents.on('dom-ready', () => {
    const url = webContents.getURL()
    if (url.includes('youtube.com')) {
      webContents.executeJavaScript(DOM_SCRIPT).catch(() => {})
    }
  })

  // YouTube SPA navigation
  webContents.on('did-navigate-in-page', (_event, url) => {
    if (url.includes('youtube.com')) {
      webContents.executeJavaScript(DOM_SCRIPT).catch(() => {})
    }
  })
}
