export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_call_id?: string
  tool_calls?: any[]
}

export interface LLMTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface LLMToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface LLMResponse {
  content: string
  toolCalls: LLMToolCall[]
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens'
}

export interface LLMProvider {
  chat(messages: any[], tools?: LLMTool[]): Promise<LLMResponse>
}

export class LLMClient {
  private provider: LLMProvider

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  async chat(messages: any[], tools?: LLMTool[]): Promise<LLMResponse> {
    return this.provider.chat(messages, tools)
  }
}
