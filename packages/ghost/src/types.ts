import type { WebContents } from 'electron'
import type { LLMClient, LLMTool } from '@silver/llm'

// --- DOM & Page State (unchanged) ---

export interface DomElement {
  index: number
  tag: string
  text: string
  type?: string
  name?: string
  href?: string
  placeholder?: string
}

export interface PageState {
  url: string
  title: string
  elements: DomElement[]
  pageText: string
  scrollInfo: { y: number; height: number; viewportHeight: number }
}

// --- Steps & Results ---

export interface GhostStep {
  step: number
  action: string
  description: string
  result?: string
  toolName?: string
  subAgentId?: string
}

// --- Tool System ---

export interface ToolDefinition {
  schema: LLMTool
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>
  describe: (args: Record<string, unknown>) => string
}

export interface ToolContext {
  workspace: Workspace
  webContents: WebContents | null
  llm: LLMClient
  events: GhostEvents
  taskId: string
  running: () => boolean
}

// --- Workspace ---

export interface Workspace {
  taskId: string
  root: string
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  editFile(path: string, oldText: string, newText: string): Promise<void>
  appendFile(path: string, content: string): Promise<void>
  listFiles(dir?: string): Promise<string[]>
  exists(path: string): Promise<boolean>
}

// --- Events ---

export interface GhostEvents {
  onStep: (step: GhostStep) => void
  onThinking: (text: string) => void
  onComplete: (success: boolean, summary: string, steps: GhostStep[]) => void
}

// --- Agent Config ---

export interface AgentConfig {
  tools?: string[]
  maxSteps?: number
  isSubAgent?: boolean
  parentTaskId?: string
}
