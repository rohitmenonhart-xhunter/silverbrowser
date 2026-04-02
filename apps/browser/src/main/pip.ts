import type { WebContents } from 'electron'

const PIP_SCRIPT = `
(() => {
  var video = document.querySelector('video');
  if (video) {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      video.requestPictureInPicture().catch(function() {});
    }
    return true;
  }
  var iframe = document.querySelector('iframe[src*="youtube"], iframe[src*="vimeo"]');
  if (iframe) {
    alert('Navigate into the video page directly for Picture-in-Picture.');
  } else {
    alert('No video found on this page.');
  }
  return false;
})()
`

export async function togglePiP(wc: WebContents) {
  try {
    await wc.executeJavaScript(PIP_SCRIPT)
  } catch (err) {
    console.error('[PiP] Failed:', err)
  }
}
