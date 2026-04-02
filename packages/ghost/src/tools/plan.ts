import type { ToolDefinition } from '../types'
import { registerTool } from '../tool-registry'

const planTool: ToolDefinition = {
  schema: {
    name: 'plan',
    description: 'Create or update the task plan. Use this at the start to outline your approach, and update it as you make progress. Plans are saved to the workspace.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'update', 'read'],
          description: 'create: write new plan, update: append progress, read: view current plan',
        },
        content: {
          type: 'string',
          description: 'Plan content (required for create/update)',
        },
      },
      required: ['action'],
    },
  },
  describe: (args) => {
    switch (args.action) {
      case 'create': return 'Create task plan'
      case 'update': return 'Update task plan'
      case 'read': return 'Read task plan'
      default: return `Plan: ${args.action}`
    }
  },
  execute: async (args, ctx) => {
    const action = String(args.action)
    const content = String(args.content || '')

    switch (action) {
      case 'create': {
        const planContent = `# Task Plan\n\n${content}\n\n---\n_Created: ${new Date().toISOString()}_\n`
        await ctx.workspace.writeFile('plan.md', planContent)
        return `Plan created and saved to workspace.`
      }
      case 'update': {
        const timestamp = new Date().toISOString()
        const update = `\n## Update — ${timestamp}\n\n${content}\n`
        await ctx.workspace.appendFile('plan.md', update)
        return `Plan updated.`
      }
      case 'read': {
        try {
          const plan = await ctx.workspace.readFile('plan.md')
          return plan || 'No plan created yet.'
        } catch {
          return 'No plan created yet. Use plan(action: "create") to start one.'
        }
      }
      default:
        return `Unknown action: ${action}. Use create, update, or read.`
    }
  },
}

registerTool('plan', planTool)
