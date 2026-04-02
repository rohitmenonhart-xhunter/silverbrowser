import type { ToolDefinition, ToolContext } from '../types'
import { registerTool } from '../tool-registry'
import { getPageState, formatPageState } from './browser-executor'

const webSearchTool: ToolDefinition = {
  schema: {
    name: 'web_search',
    description: 'Search the web using Google. Navigates to Google, enters the query, and returns search results. Requires browser access.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  describe: (args) => `Search: "${args.query}"`,
  execute: async (args, ctx) => {
    if (!ctx.webContents) return 'No browser tab available for search'
    const wc = ctx.webContents
    const query = encodeURIComponent(String(args.query))

    try {
      await wc.loadURL(`https://www.google.com/search?q=${query}`)
      await new Promise<void>(resolve => {
        if (!wc.isLoading()) { setTimeout(resolve, 500); return }
        const timer = setTimeout(() => { wc.removeListener('did-stop-loading', onStop); resolve() }, 5000)
        const onStop = () => { clearTimeout(timer); setTimeout(resolve, 500) }
        wc.once('did-stop-loading', onStop)
      })

      // Extract search results
      const results = await wc.executeJavaScript(`
        (() => {
          const items = [];
          document.querySelectorAll('#search .g, #rso .g').forEach(g => {
            const titleEl = g.querySelector('h3');
            const linkEl = g.querySelector('a[href]');
            const snippetEl = g.querySelector('.VwiC3b, [data-sncf], .st');
            if (titleEl && linkEl) {
              items.push({
                title: titleEl.textContent.trim(),
                url: linkEl.href,
                snippet: (snippetEl ? snippetEl.textContent.trim() : '').substring(0, 200),
              });
            }
          });
          return items.slice(0, 8);
        })()
      `)

      if (!results || results.length === 0) {
        return 'No search results found. Try a different query.'
      }

      let output = `Search results for "${args.query}":\n\n`
      results.forEach((r: any, i: number) => {
        output += `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}\n\n`
      })
      return output
    } catch (err: any) {
      return `Search error: ${err.message}`
    }
  },
}

const readPageTool: ToolDefinition = {
  schema: {
    name: 'read_page',
    description: 'Read the current page state including URL, title, interactive elements, and visible text. Use this to understand what is on the page.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  describe: () => 'Read current page',
  execute: async (_args, ctx) => {
    if (!ctx.webContents) return 'No browser tab available'
    const state = await getPageState(ctx.webContents)
    return formatPageState(state)
  },
}

registerTool('web_search', webSearchTool)
registerTool('read_page', readPageTool)
