import type { WebContents } from 'electron'
import type { ToolDefinition, ToolContext, PageState } from '../types'
import { GHOST_TOOLS } from './browser'
import { registerTool } from '../tool-registry'

// --- Utilities ---

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitForLoad(wc: WebContents, timeoutMs: number): Promise<void> {
  return new Promise<void>(resolve => {
    if (!wc.isLoading()) { setTimeout(resolve, 300); return }
    const timer = setTimeout(() => { wc.removeListener('did-stop-loading', onStop); resolve() }, timeoutMs)
    const onStop = () => { clearTimeout(timer); setTimeout(resolve, 300) }
    wc.once('did-stop-loading', onStop)
  })
}

function requireWc(ctx: ToolContext): WebContents {
  if (!ctx.webContents) throw new Error('No browser tab available')
  return ctx.webContents
}

// --- Page State ---

export async function getPageState(wc: WebContents): Promise<PageState> {
  await sleep(200)
  try {
    return await wc.executeJavaScript(`
      (() => {
        const elements = [];
        const selectors = 'a,button,input,select,textarea,[role="button"],[role="link"],[onclick],[tabindex]';
        const visible = Array.from(document.querySelectorAll(selectors)).filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        visible.forEach((el, idx) => {
          const r = el.getBoundingClientRect();
          if (r.top > window.innerHeight * 2) return;
          const text = (el.textContent || '').trim().substring(0, 100);
          const display = text || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || '';
          if (!display && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
          elements.push({
            index: idx, tag: el.tagName.toLowerCase(),
            text: display.substring(0, 80), type: el.type || '', name: el.name || '',
            href: (el.href || '').substring(0, 120), placeholder: el.placeholder || '',
          });
        });
        return {
          url: location.href, title: document.title,
          elements: elements.slice(0, 60),
          pageText: document.body.innerText.substring(0, 3000),
          scrollInfo: { y: Math.round(window.scrollY), height: Math.round(document.body.scrollHeight), viewportHeight: Math.round(window.innerHeight) },
        };
      })()
    `)
  } catch (err: any) {
    return { url: wc.getURL(), title: '', elements: [], pageText: `Error: ${err.message}`, scrollInfo: { y: 0, height: 0, viewportHeight: 0 } }
  }
}

export function formatPageState(state: PageState): string {
  let text = `URL: ${state.url}\nTitle: ${state.title}\n\nInteractive Elements (${state.elements.length}):\n`
  for (const el of state.elements) {
    let line = `  [${el.index}] <${el.tag}>`
    if (el.text) line += ` "${el.text}"`
    if (el.type) line += ` type=${el.type}`
    if (el.placeholder) line += ` placeholder="${el.placeholder}"`
    if (el.name) line += ` name=${el.name}`
    if (el.href && el.tag === 'a') line += ` href=${el.href}`
    text += line + '\n'
  }
  const { y, height, viewportHeight } = state.scrollInfo
  if (y + viewportHeight < height - 100) text += '\n[MORE CONTENT BELOW — use scroll]\n'
  if (y > 100) text += '[CONTENT ABOVE — use scroll up]\n'
  text += `\nVisible text:\n${state.pageText.slice(0, 1500)}`
  return text
}

// --- Tool Definitions ---

const clickTool: ToolDefinition = {
  schema: GHOST_TOOLS.find(t => t.name === 'click')!,
  describe: (args) => `Click element [${args.index}]`,
  execute: async (args, ctx) => {
    const wc = requireWc(ctx)
    const res = await wc.executeJavaScript(`
      (() => {
        const els = document.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="link"],[onclick],[tabindex]');
        const visible = Array.from(els).filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const el = visible[${Number(args.index)}];
        if (!el) return 'Element not found (' + visible.length + ' visible)';
        el.scrollIntoView({block:'center', behavior:'smooth'}); el.focus(); el.click();
        return 'Clicked: ' + (el.textContent || el.tagName).trim().substring(0, 60);
      })()
    `)
    await waitForLoad(wc, 2000)
    return res
  },
}

const fillTool: ToolDefinition = {
  schema: GHOST_TOOLS.find(t => t.name === 'fill')!,
  describe: (args) => `Type "${args.text}" into [${args.index}]`,
  execute: async (args, ctx) => {
    const wc = requireWc(ctx)
    const text = String(args.text || '')
    return wc.executeJavaScript(`
      (() => {
        const els = document.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="link"],[onclick],[tabindex]');
        const visible = Array.from(els).filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const el = visible[${Number(args.index)}];
        if (!el) return 'Element not found';
        el.scrollIntoView({block:'center'}); el.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
          || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) setter.call(el, ${JSON.stringify(text)}); else el.value = ${JSON.stringify(text)};
        el.dispatchEvent(new Event('input', {bubbles: true}));
        el.dispatchEvent(new Event('change', {bubbles: true}));
        return 'Filled: ' + ${JSON.stringify(text)};
      })()
    `)
  },
}

const navigateTool: ToolDefinition = {
  schema: GHOST_TOOLS.find(t => t.name === 'navigate')!,
  describe: (args) => `Navigate to ${args.url}`,
  execute: async (args, ctx) => {
    const wc = requireWc(ctx)
    let url = String(args.url || '')
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    try { await wc.loadURL(url); await waitForLoad(wc, 5000) } catch (e: any) { return `Navigation error: ${e.message}` }
    return `Navigated to ${url}`
  },
}

const scrollTool: ToolDefinition = {
  schema: GHOST_TOOLS.find(t => t.name === 'scroll')!,
  describe: (args) => `Scroll ${args.direction}`,
  execute: async (args, ctx) => {
    const wc = requireWc(ctx)
    const delta = args.direction === 'down' ? 600 : -600
    await wc.executeJavaScript(`window.scrollBy({top: ${delta}, behavior: 'smooth'})`)
    await sleep(400)
    return `Scrolled ${args.direction}`
  },
}

const pressKeyTool: ToolDefinition = {
  schema: GHOST_TOOLS.find(t => t.name === 'press_key')!,
  describe: (args) => `Press ${args.key}`,
  execute: async (args, ctx) => {
    const wc = requireWc(ctx)
    const key = String(args.key || 'Enter')
    await wc.executeJavaScript(`
      (() => {
        const el = document.activeElement; if (!el) return;
        const km = { 'Enter': {keyCode:13,code:'Enter',key:'Enter'}, 'Tab': {keyCode:9,code:'Tab',key:'Tab'},
          'Escape': {keyCode:27,code:'Escape',key:'Escape'}, 'ArrowDown': {keyCode:40,code:'ArrowDown',key:'ArrowDown'},
          'ArrowUp': {keyCode:38,code:'ArrowUp',key:'ArrowUp'}, 'Backspace': {keyCode:8,code:'Backspace',key:'Backspace'},
        }['${key}'] || {keyCode:0,code:'${key}',key:'${key}'};
        el.dispatchEvent(new KeyboardEvent('keydown', {...km, bubbles:true, cancelable:true}));
        el.dispatchEvent(new KeyboardEvent('keypress', {...km, bubbles:true, cancelable:true}));
        el.dispatchEvent(new KeyboardEvent('keyup', {...km, bubbles:true, cancelable:true}));
        if ('${key}' === 'Enter' && el.form) { el.form.requestSubmit ? el.form.requestSubmit() : el.form.submit(); }
      })()
    `)
    await waitForLoad(wc, 3000)
    return `Pressed ${key}`
  },
}

const extractTool: ToolDefinition = {
  schema: GHOST_TOOLS.find(t => t.name === 'extract')!,
  describe: () => 'Extract page text',
  execute: async (_args, ctx) => {
    const wc = requireWc(ctx)
    const text = await wc.executeJavaScript(`document.body.innerText.substring(0, 8000)`)
    return text || 'Empty page'
  },
}

const waitTool: ToolDefinition = {
  schema: GHOST_TOOLS.find(t => t.name === 'wait')!,
  describe: (args) => `Wait ${args.ms || 1000}ms`,
  execute: async (args) => {
    const ms = Math.min(Number(args.ms) || 1000, 5000)
    await sleep(ms)
    return `Waited ${ms}ms`
  },
}

const backTool: ToolDefinition = {
  schema: GHOST_TOOLS.find(t => t.name === 'back')!,
  describe: () => 'Go back',
  execute: async (_args, ctx) => {
    const wc = requireWc(ctx)
    wc.navigationHistory.goBack()
    await waitForLoad(wc, 3000)
    return 'Went back'
  },
}

// --- Register all browser tools ---

registerTool('click', clickTool)
registerTool('fill', fillTool)
registerTool('navigate', navigateTool)
registerTool('scroll', scrollTool)
registerTool('press_key', pressKeyTool)
registerTool('extract', extractTool)
registerTool('wait', waitTool)
registerTool('back', backTool)

// 'done' is handled by the agent loop, not the registry
