import type { WebContents } from 'electron'

const EXTRACT_SCRIPT = `
(() => {
  const selectors = ['article', '[role="main"]', '.post-content', '.article-body', '.entry-content', '.story-body', 'main'];
  let article = null;
  for (const s of selectors) {
    article = document.querySelector(s);
    if (article && article.innerText.length > 200) break;
  }
  if (!article) article = document.body;

  const title = document.querySelector('h1')?.innerText
    || document.querySelector('[class*="title"]')?.innerText
    || document.title;

  const authorEl = document.querySelector('[rel="author"], [class*="author"], [itemprop="author"], .byline');
  const author = authorEl ? authorEl.innerText.trim() : '';

  const timeEl = document.querySelector('time, [class*="date"], [class*="published"]');
  const date = timeEl ? timeEl.innerText.trim() : '';

  function cleanHTML(el) {
    const allowed = new Set(['P','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','UL','OL','LI','IMG','A','EM','STRONG','CODE','PRE','BR','FIGURE','FIGCAPTION']);
    let html = '';
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        html += child.textContent;
      } else if (child.nodeType === 1) {
        const tag = child.tagName;
        if (allowed.has(tag)) {
          const inner = cleanHTML(child);
          if (tag === 'IMG') {
            html += '<img src="' + child.src + '">';
          } else if (tag === 'A') {
            html += '<a href="' + child.href + '">' + inner + '</a>';
          } else {
            html += '<' + tag.toLowerCase() + '>' + inner + '</' + tag.toLowerCase() + '>';
          }
        } else {
          html += cleanHTML(child);
        }
      }
    }
    return html;
  }

  return {
    title: title || '',
    author: author,
    date: date,
    content: cleanHTML(article),
    url: location.href,
    domain: location.hostname,
  };
})()
`

function buildReaderHTML(data: { title: string; author: string; date: string; content: string; domain: string }): string {
  const escaped = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const meta = [data.author, data.date].filter(Boolean).join(' · ')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Reader — ${escaped(data.title)}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
:root { --bg:#1a1a1e; --text:#d4d4d8; --heading:#e8e9ed; --accent:#c0c4ce; --muted:#5a5d66; --surface:#232328; --fs:18px; }
body { background:var(--bg); color:var(--text); font-family:Georgia,'Times New Roman',serif; line-height:1.85; }
body.light { --bg:#faf9f7; --text:#374151; --heading:#111; --accent:#6b7280; --muted:#9ca3af; --surface:#f0eeeb; }
body.sepia { --bg:#f4ecd8; --text:#5c4b37; --heading:#2d1f10; --accent:#8b7355; --muted:#a89279; --surface:#ebe3cf; }

.toolbar { position:fixed; top:0; left:0; right:0; height:48px; background:var(--surface); border-bottom:1px solid rgba(128,128,128,0.1); display:flex; align-items:center; justify-content:center; gap:12px; z-index:10; }
.toolbar button { background:none; border:1px solid rgba(128,128,128,0.15); color:var(--muted); cursor:pointer; padding:5px 10px; border-radius:6px; font-size:11px; font-family:-apple-system,system-ui,sans-serif; }
.toolbar button:hover { background:rgba(128,128,128,0.1); color:var(--text); }
.toolbar button.active { background:rgba(128,128,128,0.15); color:var(--heading); }
.toolbar .close { position:absolute; right:16px; font-size:18px; border:none; padding:4px 10px; }
.toolbar .sep { color:var(--muted); font-size:10px; }

.reader { max-width:680px; margin:0 auto; padding:80px 20px 80px; }
.meta { margin-bottom:32px; border-bottom:1px solid rgba(128,128,128,0.1); padding-bottom:24px; }
.meta .domain { font-size:11px; color:var(--accent); font-family:-apple-system,system-ui,sans-serif; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px; }
.meta h1 { font-size:32px; font-weight:700; color:var(--heading); line-height:1.3; margin-bottom:10px; font-family:-apple-system,system-ui,sans-serif; }
.meta .info { font-size:12px; color:var(--muted); font-family:-apple-system,system-ui,sans-serif; }

.content p { margin-bottom:1.4em; font-size:var(--fs); }
.content h1,.content h2,.content h3,.content h4 { color:var(--heading); margin:1.5em 0 0.5em; font-family:-apple-system,system-ui,sans-serif; }
.content h2 { font-size:24px; } .content h3 { font-size:20px; }
.content a { color:var(--accent); }
.content blockquote { border-left:3px solid var(--accent); padding-left:20px; margin:1.5em 0; color:var(--muted); font-style:italic; }
.content code { background:var(--surface); padding:2px 6px; border-radius:4px; font-size:0.9em; font-family:'SF Mono',Menlo,monospace; }
.content pre { background:var(--surface); padding:16px; border-radius:8px; overflow-x:auto; margin:1.5em 0; }
.content pre code { background:none; padding:0; }
.content img { max-width:100%; border-radius:8px; margin:20px 0; }
.content ul,.content ol { padding-left:1.5em; margin-bottom:1.4em; }
.content li { margin-bottom:0.5em; font-size:var(--fs); }
</style></head>
<body>
<div class="toolbar">
  <button onclick="setTheme('')" id="t-dark" class="active">Dark</button>
  <button onclick="setTheme('light')" id="t-light">Light</button>
  <button onclick="setTheme('sepia')" id="t-sepia">Sepia</button>
  <span class="sep">|</span>
  <button onclick="sz(-2)">A-</button>
  <button onclick="sz(2)">A+</button>
  <span class="sep">|</span>
  <button onclick="tf()">Serif / Sans</button>
  <button class="close" onclick="history.back()">×</button>
</div>
<div class="reader">
  <div class="meta">
    <div class="domain">${escaped(data.domain)}</div>
    <h1>${escaped(data.title)}</h1>
    <div class="info">${escaped(meta)}</div>
  </div>
  <div class="content" id="c">${data.content}</div>
</div>
<script>
var fs=18,sf=true;
function setTheme(t){document.body.className=t;document.querySelectorAll('.toolbar button[id]').forEach(function(b){b.classList.remove('active')});document.getElementById('t-'+(t||'dark')).classList.add('active')}
function sz(d){fs=Math.max(14,Math.min(28,fs+d));document.documentElement.style.setProperty('--fs',fs+'px')}
function tf(){sf=!sf;document.getElementById('c').style.fontFamily=sf?"Georgia,'Times New Roman',serif":"-apple-system,system-ui,sans-serif"}
</script>
</body></html>`
}

export async function activateReaderMode(wc: WebContents) {
  try {
    const data = await wc.executeJavaScript(EXTRACT_SCRIPT)
    if (!data || !data.content) return
    const html = buildReaderHTML(data)
    wc.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  } catch (err) {
    console.error('[Reader] Failed:', err)
  }
}
