import type { LLMProvider, LLMMessage, LLMTool, LLMToolCall, LLMResponse } from '../provider'

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'anthropic/claude-sonnet-4') {
    this.apiKey = apiKey
    this.model = model
  }

  async chat(messages: LLMMessage[], tools?: LLMTool[]): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages,  // Pass through as-is (already OpenAI format from agent)
      max_tokens: 2048,
      temperature: 0,
    }

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }))
      body.tool_choice = 'auto'
    }

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://silver-browser.app',
        'X-Title': 'Silver Browser Ghost',
      },
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`LLM API error ${resp.status}: ${text.slice(0, 300)}`)
    }

    const data = await resp.json()
    const choice = data.choices?.[0]

    if (!choice) {
      throw new Error(`No response from LLM. Raw: ${JSON.stringify(data).slice(0, 200)}`)
    }

    const msg = choice.message
    const toolCalls: LLMToolCall[] = (msg.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      input: (() => {
        try {
          return JSON.parse(tc.function.arguments || '{}')
        } catch {
          return {}
        }
      })(),
    }))

    return {
      content: msg.content ?? '',
      toolCalls,
      stopReason: toolCalls.length > 0 ? 'tool_use' : (choice.finish_reason === 'length' ? 'max_tokens' : 'end_turn'),
    }
  }
}
