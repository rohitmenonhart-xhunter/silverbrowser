import type { ToolDefinition } from '../types'
import { registerTool } from '../tool-registry'

const readFileTool: ToolDefinition = {
  schema: {
    name: 'read_file',
    description: 'Read a file from the task workspace. Returns file contents.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to workspace root' },
      },
      required: ['path'],
    },
  },
  describe: (args) => `Read file: ${args.path}`,
  execute: async (args, ctx) => {
    try {
      return await ctx.workspace.readFile(String(args.path))
    } catch (err: any) {
      return `File not found: ${args.path}`
    }
  },
}

const writeFileTool: ToolDefinition = {
  schema: {
    name: 'write_file',
    description: 'Write content to a file in the task workspace. Creates or overwrites the file.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to workspace root' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
  describe: (args) => `Write file: ${args.path}`,
  execute: async (args, ctx) => {
    await ctx.workspace.writeFile(String(args.path), String(args.content))
    return `Written: ${args.path} (${String(args.content).length} chars)`
  },
}

const editFileTool: ToolDefinition = {
  schema: {
    name: 'edit_file',
    description: 'Find and replace text in a workspace file. The old_text must exist exactly in the file.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to workspace root' },
        old_text: { type: 'string', description: 'Exact text to find' },
        new_text: { type: 'string', description: 'Text to replace it with' },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
  describe: (args) => `Edit file: ${args.path}`,
  execute: async (args, ctx) => {
    try {
      await ctx.workspace.editFile(String(args.path), String(args.old_text), String(args.new_text))
      return `Edited: ${args.path}`
    } catch (err: any) {
      return `Edit failed: ${err.message}`
    }
  },
}

const listFilesTool: ToolDefinition = {
  schema: {
    name: 'list_files',
    description: 'List all files in the task workspace.',
    input_schema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Subdirectory to list (default: workspace root)' },
      },
    },
  },
  describe: (args) => `List files${args.dir ? ` in ${args.dir}` : ''}`,
  execute: async (args, ctx) => {
    const files = await ctx.workspace.listFiles(String(args.dir || '.'))
    if (files.length === 0) return 'Workspace is empty'
    return `Files:\n${files.map(f => `  ${f}`).join('\n')}`
  },
}

registerTool('read_file', readFileTool)
registerTool('write_file', writeFileTool)
registerTool('edit_file', editFileTool)
registerTool('list_files', listFilesTool)
