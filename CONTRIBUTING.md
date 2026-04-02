# Contributing to Silver Browser

Thanks for your interest in contributing to Silver. This guide will help you get started.

## Getting started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/silver.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b my-feature`
5. Make your changes
6. Run the app: `pnpm dev`
7. Commit and push
8. Open a pull request

## Project structure

Silver is a pnpm monorepo. Each package is independent:

| Package | What it does |
|---------|-------------|
| `apps/browser` | Electron app (main process, renderer, preload) |
| `packages/ghost` | Ghost AI agent engine + tools |
| `packages/llm` | LLM provider abstraction |
| `packages/adblocker` | Ad blocking (YouTube, Hotstar, network) |
| `packages/vault` | Encrypted password manager |
| `packages/shield` | DNS-over-HTTPS privacy |
| `packages/tabs` | Tab management |
| `packages/shared` | Types, IPC channels |
| `packages/importer` | Browser data import |
| `packages/extensions` | Chrome extension support |

## Good first issues

- **Ghost tools**: Add a new tool in `packages/ghost/src/tools/`. Follow the pattern in `file.ts` or `terminal.ts`.
- **Ad blocking**: Add domains to `packages/adblocker/src/network.ts` or improve YouTube/Hotstar scripts.
- **Browser imports**: Add new browser sources in `packages/importer/`.
- **UI**: Components are in `apps/browser/src/renderer/components/`.
- **Linux/Windows**: Test and fix platform-specific issues.

## Code style

- TypeScript strict mode
- No emojis in UI — use SVG icons
- Design tokens in `apps/browser/src/renderer/styles/tokens.css`
- Inter font, `--sv-*` CSS custom properties
- Keep packages independent — don't create circular dependencies

## Ghost agent tools

To add a new Ghost tool:

```typescript
// packages/ghost/src/tools/my-tool.ts
import type { ToolDefinition } from '../types'
import { registerTool } from '../tool-registry'

const myTool: ToolDefinition = {
  schema: {
    name: 'my_tool',
    description: 'What this tool does (seen by the LLM)',
    input_schema: {
      type: 'object',
      properties: {
        param: { type: 'string', description: 'Parameter description' },
      },
      required: ['param'],
    },
  },
  describe: (args) => `Human-readable: ${args.param}`,
  execute: async (args, ctx) => {
    // ctx.workspace — file access
    // ctx.webContents — browser tab (may be null)
    // ctx.llm — LLM client
    return 'Result string shown to the LLM'
  },
}

registerTool('my_tool', myTool)
```

Then import it in `packages/ghost/src/agent.ts` and add to the default tools list.

## Pull requests

- Keep PRs focused — one feature or fix per PR
- Write a clear description of what changed and why
- Test your changes with `pnpm dev`
- Don't break existing features

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 license.
