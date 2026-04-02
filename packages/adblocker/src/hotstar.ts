import type { WebContents } from 'electron'

/**
 * Hotstar/Disney+ ad blocking.
 * Strategy:
 * - Network layer blocks ad CDN (hesads.akamaized.net)
 * - DOM layer detects stuck/loading ad state and forces past it
 * - Clicks skip buttons, mutes + speeds through ads that play
 */
const HOTSTAR_AD_SCRIPT = `
(function silverHotstarAd() {
  if (window.__silverHotstarAd) return;
  window.__silverHotstarAd = true;

  var adWasPlaying = false;
  var userVolume = 1;
  var stuckCounter = 0;

  function handleAds() {
    var video = document.querySelector('video');
    if (!video) return;

    // --- Detect ad state ---
    var isAd = false;

    // Method 1: Check for ad-related DOM elements
    var adEls = document.querySelectorAll(
      '[class*="ad-overlay" i], [class*="ad-banner" i], [class*="ad-container" i], ' +
      '[class*="adBreak" i], [class*="ad-break" i], ' +
      '[class*="preroll" i], [class*="midroll" i], ' +
      '.vjs-ad-playing, .vjs-ad-loading'
    );
    if (adEls.length > 0) isAd = true;

    // Method 2: Check for skip/ad timer text anywhere
    var skipBtn = document.querySelector(
      '[class*="skip" i]:not([class*="chapter"]), ' +
      'button[aria-label*="skip" i], button[aria-label*="Skip"]'
    );
    if (skipBtn) isAd = true;

    // Method 3: Video is stuck loading (buffering for >3s could mean blocked ad)
    if (video.readyState < 3 && video.currentTime === 0 && !video.paused) {
      stuckCounter++;
      // If stuck for ~2 seconds (120 frames), try to unstick
      if (stuckCounter > 120) {
        // Reload the video source or skip forward
        video.currentTime = 0.1;
        stuckCounter = 0;
      }
    } else {
      stuckCounter = 0;
    }

    // --- Handle ad ---
    if (isAd) {
      if (!adWasPlaying) {
        userVolume = video.volume;
        adWasPlaying = true;
      }

      // Mute
      video.volume = 0;
      video.muted = true;

      // Speed through
      video.playbackRate = 16;

      // Seek to end
      if (video.duration && isFinite(video.duration) && video.duration > 0.5) {
        video.currentTime = video.duration - 0.1;
      }

      // Click skip buttons
      if (skipBtn) skipBtn.click();

      // Try any element with skip-like text
      document.querySelectorAll('button, div[role="button"], span[role="button"]').forEach(function(el) {
        var text = (el.textContent || '').trim().toLowerCase();
        if (text === 'skip' || text === 'skip ad' || text === 'skip ads' ||
            text === 'skip now' || text === 'skip intro') {
          el.click();
        }
      });

      // Hide ad overlays
      adEls.forEach(function(el) {
        el.style.setProperty('display', 'none', 'important');
      });
    }

    // --- Restore after ad ---
    if (!isAd && adWasPlaying) {
      adWasPlaying = false;
      video.volume = userVolume;
      video.muted = false;
      video.playbackRate = 1;
    }
  }

  function loop() {
    handleAds();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  new MutationObserver(handleAds).observe(
    document.body || document.documentElement,
    { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }
  );
})();
`

export function injectHotstarAdBlocker(webContents: WebContents) {
  webContents.on('dom-ready', () => {
    const url = webContents.getURL()
    if (isHotstarUrl(url)) {
      webContents.executeJavaScript(HOTSTAR_AD_SCRIPT).catch(() => {})
    }
  })

  webContents.on('did-navigate-in-page', (_event, url) => {
    if (isHotstarUrl(url)) {
      webContents.executeJavaScript(HOTSTAR_AD_SCRIPT).catch(() => {})
    }
  })
}

function isHotstarUrl(url: string): boolean {
  return url.includes('hotstar.com') || url.includes('jiocinema')
}
