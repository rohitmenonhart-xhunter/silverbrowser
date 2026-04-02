import type { ToolDefinition } from '../types'
import { registerTool } from '../tool-registry'

// The actual sub-agent spawning is handled by the agent.ts loop
// This tool just defines the schema and triggers the spawn

const spawnAgentTool: ToolDefinition = {
  schema: {
    name: 'spawn_agent',
    description: `Spawn a focused sub-agent to handle a specific subtask independently. The sub-agent works autonomously and returns its result. Use sub-agents for:
- Deep research on a topic (give it: web_search, read_page, navigate, extract, read_file, write_file)
- Browser automation workflows (give it: click, fill, navigate, scroll, press_key, extract, wait, back)
- Data analysis tasks (give it: terminal, read_file, write_file)
Sub-agents share your workspace and browser tab. They cannot spawn more sub-agents.`,
    input_schema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Clear description of what the sub-agent should accomplish' },
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tool names the sub-agent can use (e.g., ["web_search", "read_page", "write_file"])',
        },
        max_steps: { type: 'number', description: 'Maximum steps for the sub-agent (default: 15)' },
      },
      required: ['task', 'tools'],
    },
  },
  describe: (args) => `Spawn sub-agent: ${String(args.task).slice(0, 60)}`,
  execute: async (_args, _ctx) => {
    // This is a placeholder — actual execution is intercepted by the agent loop
    // The agent loop checks for 'spawn_agent' tool calls and handles them specially
    return 'Sub-agent execution is handled by the agent loop'
  },
}

registerTool('spawn_agent', spawnAgentTool)
