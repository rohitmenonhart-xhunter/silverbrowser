import type { WebContents } from 'electron'
import { LLMClient } from '@silver/llm'
import { GHOST_TOOLS } from './tools/browser'
import type { GhostStep, GhostEvents, AgentConfig, ToolContext, Workspace } from './types'
import { ToolRegistry } from './tool-registry'
import { createWorkspace } from './workspace'
import { buildSystemPrompt, buildSubAgentPrompt } from './system-prompt'
import { getPageState, formatPageState } from './tools/browser-executor'

// Safe log that won't crash on EPIPE
function log(...args: any[]) { try { log(...args) } catch {} }

// Import tool modules to trigger registerTool calls
import './tools/browser-executor'
import './tools/file'
import './tools/terminal'
import './tools/research'
import './tools/plan'
import './tools/sub-agent'

const BROWSER_TOOLS = ['click', 'fill', 'navigate', 'scroll', 'press_key', 'extract', 'wait', 'back']
const FILE_TOOLS = ['read_file', 'write_file', 'edit_file', 'list_files']
const ALL_DEFAULT_TOOLS = [
  ...BROWSER_TOOLS,
  ...FILE_TOOLS,
  'terminal', 'web_search', 'read_page', 'plan', 'spawn_agent', 'done',
]

// 'done' is a virtual tool handled by the agent loop, not the registry
const DONE_SCHEMA = GHOST_TOOLS.find(t => t.name === 'done')!

export { GhostEvents }

export class GhostAgent {
  private llm: LLMClient
  private running = false
  private steps: GhostStep[] = []
  private events: GhostEvents
  private config: AgentConfig

  constructor(llm: LLMClient, events: GhostEvents, config?: AgentConfig) {
    this.llm = llm
    this.events = events
    this.config = config || {}
  }

  async run(task: string, webContents: WebContents, maxSteps?: number): Promise<void> {
    this.running = true
    this.steps = []

    const stepLimit = maxSteps || this.config.maxSteps || 50
    const isSubAgent = this.config.isSubAgent || false
    const toolNames = this.config.tools || ALL_DEFAULT_TOOLS

    // Remove sub-agent spawning for sub-agents (prevent recursion)
    const effectiveTools = isSubAgent
      ? toolNames.filter(t => t !== 'spawn_agent')
      : toolNames

    const registry = new ToolRegistry(effectiveTools.filter(t => t !== 'done'))
    const workspace = await createWorkspace(this.config.parentTaskId)

    log(`[Ghost] Task started (${workspace.taskId}): ${task.slice(0, 100)}`)
    log(`[Ghost] Tools: ${registry.names.join(', ')}`)
    log(`[Ghost] Workspace: ${workspace.root}`)

    // Build system prompt
    const hasBrowser = BROWSER_TOOLS.some(t => registry.has(t))
    const systemPrompt = isSubAgent
      ? buildSubAgentPrompt(task, registry.names)
      : buildSystemPrompt({
          hasBrowser,
          hasTerminal: registry.has('terminal'),
          hasFiles: FILE_TOOLS.some(t => registry.has(t)),
          hasSubAgents: registry.has('spawn_agent'),
          isSubAgent: false,
          toolNames: [...registry.names, 'done'],
        })

    // Save task info to workspace
    await workspace.writeFile('task.md', `# Task\n\n${task}\n\n_Started: ${new Date().toISOString()}_\n`)

    // LLM schemas: registry tools + 'done'
    const schemas = [...registry.schemas, DONE_SCHEMA]

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Task: ${task}\n\nBegin by planning your approach, then execute.` },
    ]

    const ctx: ToolContext = {
      workspace,
      webContents,
      llm: this.llm,
      events: this.events,
      taskId: workspace.taskId,
      running: () => this.running,
    }

    try {
      for (let step = 0; step < stepLimit && this.running; step++) {
        // 1. Observe page state (only if we have browser tools)
        if (hasBrowser && webContents) {
          this.events.onThinking('Reading page...')
          const state = await getPageState(webContents)
          const stateText = formatPageState(state)
          log(`[Ghost] Step ${step + 1} — URL: ${state.url}, Elements: ${state.elements.length}`)

          messages.push({
            role: 'user',
            content: `Current page state:\n${stateText}`,
          })
        }

        // 2. Ask LLM
        this.events.onThinking('Thinking...')
        const response = await this.llm.chat(messages, schemas)

        // 3. Handle text-only response
        if (response.toolCalls.length === 0) {
          messages.push({ role: 'assistant', content: response.content })
          this.events.onThinking(response.content)
          const ghostStep: GhostStep = {
            step: step + 1, action: 'thinking',
            description: response.content.slice(0, 200),
          }
          this.steps.push(ghostStep)
          this.events.onStep(ghostStep)
          continue
        }

        // 4. Add assistant message with tool_calls
        messages.push({
          role: 'assistant',
          content: response.content || null,
          tool_calls: response.toolCalls.map(tc => ({
            id: tc.id, type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.input) },
          })),
        })

        // 5. Execute each tool call
        for (const toolCall of response.toolCalls) {
          if (!this.running) break

          // --- Done ---
          if (toolCall.name === 'done') {
            const result = String((toolCall.input as any).result || 'Task completed')
            const ghostStep: GhostStep = { step: step + 1, action: 'done', description: result }
            this.steps.push(ghostStep)
            this.events.onStep(ghostStep)

            // Save result to workspace
            await workspace.writeFile('result.md', `# Result\n\n${result}\n\n_Completed: ${new Date().toISOString()}_\n`)
            this.events.onComplete(true, result, this.steps)
            this.running = false
            return
          }

          // --- Sub-agent ---
          if (toolCall.name === 'spawn_agent') {
            const subTask = String((toolCall.input as any).task)
            const subTools = (toolCall.input as any).tools as string[] || BROWSER_TOOLS
            const subMaxSteps = Math.min(Number((toolCall.input as any).max_steps) || 15, 25)

            this.events.onThinking(`Spawning sub-agent: ${subTask.slice(0, 50)}...`)

            const ghostStep: GhostStep = {
              step: step + 1, action: 'spawn_agent',
              description: `Sub-agent: ${subTask.slice(0, 100)}`,
              toolName: 'spawn_agent',
            }
            this.steps.push(ghostStep)
            this.events.onStep(ghostStep)

            // Run sub-agent
            const subResult = await this.runSubAgent(subTask, subTools, subMaxSteps, webContents, workspace)

            ghostStep.result = subResult.slice(0, 300)

            messages.push({
              role: 'tool',
              content: subResult,
              tool_call_id: toolCall.id,
            })
            continue
          }

          // --- Regular tool ---
          const toolName = toolCall.name
          this.events.onThinking(`${registry.describe(toolName, toolCall.input)}...`)

          const result = await registry.execute(toolName, toolCall.input, ctx)
          log(`[Ghost] ${toolName} → ${result.slice(0, 100)}`)

          const ghostStep: GhostStep = {
            step: step + 1,
            action: toolName,
            description: registry.describe(toolName, toolCall.input),
            result: result.slice(0, 300),
            toolName,
          }
          this.steps.push(ghostStep)
          this.events.onStep(ghostStep)

          messages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
          })
        }

        // Brief pause between steps
        await this.sleep(300)
      }

      this.events.onComplete(false, 'Reached maximum steps without completing', this.steps)
      this.running = false
    } catch (err: any) {
      log('[Ghost] Fatal error:', err)
      await workspace.writeFile('error.md', `# Error\n\n${err.message}\n\n${err.stack}\n`)
      this.events.onComplete(false, `Error: ${err.message}`, this.steps)
      this.running = false
    }
  }

  private async runSubAgent(
    task: string,
    tools: string[],
    maxSteps: number,
    webContents: WebContents,
    parentWorkspace: Workspace,
  ): Promise<string> {
    return new Promise<string>((resolve) => {
      let subResult = ''

      const subEvents: GhostEvents = {
        onStep: (step) => {
          // Forward sub-agent steps to parent UI
          const parentStep: GhostStep = {
            ...step,
            action: `sub:${step.action}`,
            subAgentId: 'sub',
          }
          this.events.onStep(parentStep)
        },
        onThinking: (text) => {
          this.events.onThinking(`[Sub-agent] ${text}`)
        },
        onComplete: (success, summary) => {
          subResult = success ? summary : `Sub-agent failed: ${summary}`
          resolve(subResult)
        },
      }

      const subAgent = new GhostAgent(this.llm, subEvents, {
        tools: tools.filter(t => t !== 'spawn_agent'), // No recursive spawning
        maxSteps,
        isSubAgent: true,
        parentTaskId: parentWorkspace.taskId,
      })

      subAgent.run(task, webContents, maxSteps).catch((err) => {
        resolve(`Sub-agent error: ${err.message}`)
      })
    })
  }

  stop() {
    this.running = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
