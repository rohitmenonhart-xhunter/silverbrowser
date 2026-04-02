import type { LLMTool } from '@silver/llm'
import type { ToolDefinition, ToolContext } from './types'

const ALL_TOOLS = new Map<string, ToolDefinition>()

export function registerTool(name: string, tool: ToolDefinition) {
  ALL_TOOLS.set(name, tool)
}

export function getAllToolNames(): string[] {
  return Array.from(ALL_TOOLS.keys())
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition>

  constructor(toolNames?: string[]) {
    if (toolNames) {
      this.tools = new Map()
      for (const name of toolNames) {
        const tool = ALL_TOOLS.get(name)
        if (tool) this.tools.set(name, tool)
      }
    } else {
      this.tools = new Map(ALL_TOOLS)
    }
  }

  get schemas(): LLMTool[] {
    return Array.from(this.tools.values()).map(t => t.schema)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  describe(name: string, args: Record<string, unknown>): string {
    const tool = this.tools.get(name)
    return tool ? tool.describe(args) : `${name}(${JSON.stringify(args)})`
  }

  async execute(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
    const tool = this.tools.get(name)
    if (!tool) return `Unknown tool: ${name}`
    try {
      return await tool.execute(args, ctx)
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  }

  get names(): string[] {
    return Array.from(this.tools.keys())
  }
}
