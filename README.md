# Silver Browser

**The open-source AI-native browser.** Built by [Hitroo Labs](https://hitroo.com).

Silver is an Electron-based browser with a built-in autonomous AI agent called **Ghost**. It's not a wrapper around Chrome with an AI sidebar — it's a browser rebuilt from the ground up where AI is a first-class citizen.

---

## What makes Silver different

| Feature | Chrome | Arc | Silver |
|---------|--------|-----|--------|
| Built-in AI agent | No | No | Ghost — autonomous browser control |
| Sub-agent spawning | No | No | Ghost spawns focused sub-agents |
| Agent workspace | No | No | Per-task file system (.ghost/) |
| Terminal access | No | No | Ghost runs shell commands |
| Ad blocking (engine-level) | Extension | No | YouTube, Hotstar, network-level |
| DRM (Widevine) | Yes | Yes | Yes (castLabs) |
| Encrypted vault | No | No | AES-256-GCM + Touch ID |
| Encrypted DNS | No | No | Silver Shield (Cloudflare DoH) |
| Open source | Chromium only | No | Everything |

---

## Ghost Agent

Ghost is Silver's built-in AI agent. It doesn't just answer questions — it **controls the browser autonomously**.

### Two modes

**Chat** — Talk with any web page. Ghost reads the current page and answers questions about it with full context. Persistent conversation history.

**Agent** — Describe a task. Ghost will:
- Create a plan
- Browse the web, click, fill forms, navigate
- Run terminal commands
- Read and write files in a per-task workspace
- Spawn sub-agents for parallel work
- Search the web for research
- Save findings and deliver results

### Architecture

```
Ghost Agent
  |-- Tool Registry (pluggable tools)
  |     |-- Browser tools (click, fill, navigate, scroll, extract...)
  |     |-- File tools (read, write, edit workspace files)
  |     |-- Terminal (shell command execution)
  |     |-- Research (web search, page reading)
  |     |-- Plan (task planning and tracking)
  |     |-- Sub-agent (spawn focused child agents)
  |
  |-- Workspace (~/.ghost/tasks/{id}/)
  |     |-- plan.md, task.md, result.md, notes...
  |
  |-- LLM Provider (OpenRouter — Claude, GPT-4o, Gemini)
```

Each task gets its own workspace directory with markdown files that persist across steps.

---

## Features

### Browser
- Arc-style sidebar with vertical tabs
- Adaptive page-color tinting
- Split view (two tabs side by side)
- Tab pinning, reordering, incognito
- Keyboard-first (Cmd+T, Cmd+W, Cmd+K for Ghost)
- Dark/light theme with warm whites
- Reader mode (dark/light/sepia)
- Picture-in-Picture
- Chrome extension support
- Session restore, zoom, print, find-in-page

### Privacy & Security
- **Silver Shield** — Cloudflare DNS-over-HTTPS
- **Ad Blocker** — Engine-level YouTube ad skipping, Hotstar, 31 blocked domains
- **Vault** — AES-256-GCM encrypted password manager with Touch ID + PIN
- **Safe Folder** — Encrypted file storage
- **Stealth** — Anti-fingerprinting (navigator, WebGL, plugins, UA)

### Platform
- Built on Electron (castLabs fork for Widevine DRM)
- pnpm monorepo with modular packages
- React 19 + Zustand + Tailwind CSS 4
- Inter font, SVG icons throughout (zero emojis)

---

## Getting started

### Prerequisites
- Node.js 20+
- pnpm 9+
- macOS (Linux/Windows coming soon)

### Install

```bash
git clone https://github.com/nichin-labs/silver.git
cd silver
pnpm install
```

### Development

```bash
pnpm dev
```

This starts the Electron app with hot reload.

### Build

```bash
pnpm build
```

---

## Project structure

```
silver/
  apps/
    browser/              # Electron app
      src/
        main/             # Main process (window, IPC, tabs, Ghost)
        renderer/         # React UI (sidebar, Ghost panel, settings)
        preload/          # IPC bridge
        native/           # Swift helpers (Google auth)
  packages/
    ghost/                # Ghost AI agent engine
    llm/                  # LLM provider abstraction (OpenRouter)
    adblocker/            # Ad blocking (YouTube, Hotstar, network)
    vault/                # Encrypted password manager + safe folder
    shield/               # DNS-over-HTTPS privacy
    tabs/                 # Tab management (WebContentsView)
    shared/               # Types, IPC channels
    importer/             # Browser data import
    extensions/           # Chrome extension support
```

---

## Ghost API key

Ghost uses [OpenRouter](https://openrouter.ai) for LLM access. Get a free API key at [openrouter.ai/keys](https://openrouter.ai/keys) and add it in Ghost settings (gear icon in the Ghost panel).

Supported models:
- Claude Sonnet 4 (default)
- Claude Haiku 3.5
- GPT-4o / GPT-4o Mini
- Gemini 2.5 Flash / Pro

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Silver is built to be contributed to. The modular package architecture means you can work on the ad blocker without touching the AI agent, or improve the vault without knowing how tabs work.

**Good first contributions:**
- Add new Ghost tools (packages/ghost/src/tools/)
- Improve ad blocking rules (packages/adblocker/)
- Add browser import sources (packages/importer/)
- UI polish and accessibility
- Linux and Windows support

---

## Roadmap

- [ ] Silver Extensions Store
- [ ] Profile / Spaces system
- [ ] History page with search
- [ ] Ghost Pro (cloud sync, premium models)
- [ ] Linux + Windows builds
- [ ] Mobile companion app
- [ ] Ghost plugins (community tools)
- [ ] Silver Search (privacy-first default search)

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

Built with intensity by [Hitroo Labs](https://hitroo.com).
