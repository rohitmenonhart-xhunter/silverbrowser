import { exec } from 'child_process'
import type { ToolDefinition } from '../types'
import { registerTool } from '../tool-registry'

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/(?!\w)/,    // rm -rf /
  /mkfs\./,                  // format disk
  /dd\s+if=/,               // raw disk write
  /:\(\)\{\s*:\|:/,         // fork bomb
]

const terminalTool: ToolDefinition = {
  schema: {
    name: 'terminal',
    description: 'Execute a shell command. Runs in the task workspace directory. Use for data processing, API calls (curl), file manipulation, running scripts, etc. Returns stdout + stderr.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        timeout_ms: { type: 'number', description: 'Timeout in milliseconds (default: 30000, max: 120000)' },
      },
      required: ['command'],
    },
  },
  describe: (args) => `Run: ${String(args.command).slice(0, 80)}`,
  execute: async (args, ctx) => {
    const command = String(args.command)
    const timeout = Math.min(Number(args.timeout_ms) || 30000, 120000)

    // Safety check
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        return `Blocked: dangerous command pattern detected`
      }
    }

    return new Promise<string>((resolve) => {
      const proc = exec(command, {
        cwd: ctx.workspace.root,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB
        env: { ...process.env, HOME: process.env.HOME },
      }, (error, stdout, stderr) => {
        let output = ''
        if (stdout) output += stdout
        if (stderr) output += (output ? '\n--- stderr ---\n' : '') + stderr
        if (error && !output) output = `Error: ${error.message}`
        if (!output) output = '(no output)'
        resolve(output.slice(0, 8000))
      })
    })
  },
}

registerTool('terminal', terminalTool)
