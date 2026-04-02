import type { LLMTool } from '@silver/llm'

export const GHOST_TOOLS: LLMTool[] = [
  {
    name: 'click',
    description: 'Click an interactive element on the page by its index number from the element list',
    input_schema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'Element index from the interactive elements list' },
      },
      required: ['index'],
    },
  },
  {
    name: 'fill',
    description: 'Type text into an input field by its index number. Clears the field first.',
    input_schema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'Element index of the input field' },
        text: { type: 'string', description: 'Text to type into the field' },
      },
      required: ['index', 'text'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a URL',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'scroll',
    description: 'Scroll the page up or down',
    input_schema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
      },
      required: ['direction'],
    },
  },
  {
    name: 'press_key',
    description: 'Press a keyboard key (Enter, Tab, Escape, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key to press (Enter, Tab, Escape, ArrowDown, etc.)' },
      },
      required: ['key'],
    },
  },
  {
    name: 'extract',
    description: 'Extract the full text content of the current page',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'wait',
    description: 'Wait for a specified number of milliseconds',
    input_schema: {
      type: 'object',
      properties: {
        ms: { type: 'number', description: 'Milliseconds to wait (default 1000)' },
      },
    },
  },
  {
    name: 'back',
    description: 'Go back to the previous page',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'done',
    description: 'Task is complete. Provide the result summary.',
    input_schema: {
      type: 'object',
      properties: {
        result: { type: 'string', description: 'Summary of what was accomplished' },
      },
      required: ['result'],
    },
  },
]
