// ─── GLM-4.7-Flash API Client ────────────────────────────────
// Wraps Zhipu AI's chat completions API (OpenAI-compatible format)
// https://open.bigmodel.cn/api/paas/v4/chat/completions

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const DEFAULT_MODEL = 'glm-4.7-flash'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 2048
const REQUEST_TIMEOUT_MS = 30_000
const STREAM_TIMEOUT_MS = 120_000

// ─── Types ──────────────────────────────────────────────────

export interface GlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: GlmToolCall[]
  tool_call_id?: string
}

export interface GlmToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface GlmTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface GlmChatOptions {
  apiKey: string
  messages: GlmMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tools?: GlmTool[]
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface GlmChatResult {
  content: string
  tokenUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: string
  toolCalls?: GlmToolCall[]
}

export interface GlmStreamChunk {
  delta: string
  finishReason: string | null
}

// ─── Non-streaming ──────────────────────────────────────────

export async function glmChat(options: GlmChatOptions): Promise<GlmChatResult> {
  const {
    apiKey,
    messages,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
    tools,
    tool_choice,
  } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  // Build request body — include tools only when provided
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  }
  if (tools?.length) {
    body.tools = tools
    body.tool_choice = tool_choice ?? 'auto'
  }

  try {
    const res = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'unknown')
      throw new Error(`GLM API error ${res.status}: ${errorBody}`)
    }

    const json = await res.json() as {
      choices?: {
        message?: {
          content?: string
          tool_calls?: GlmToolCall[]
        }
        finish_reason?: string
      }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }

    if (!json.choices?.length) {
      throw new Error('GLM API returned no choices')
    }

    const choice = json.choices[0]
    return {
      content: choice.message?.content ?? '',
      tokenUsage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
      },
      finishReason: choice.finish_reason ?? 'stop',
      toolCalls: choice.message?.tool_calls,
    }
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Streaming ──────────────────────────────────────────────

export async function* glmChatStream(options: GlmChatOptions): AsyncGenerator<GlmStreamChunk> {
  const {
    apiKey,
    messages,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)

  try {
    const res = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'unknown')
      throw new Error(`GLM API stream error ${res.status}: ${errorBody}`)
    }

    if (!res.body) {
      throw new Error('GLM API stream returned no body')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') return

          try {
            const chunk = JSON.parse(data) as {
              choices?: { delta?: { content?: string }; finish_reason?: string | null }[]
            }
            const delta = chunk.choices?.[0]?.delta?.content
            const finishReason = chunk.choices?.[0]?.finish_reason ?? null
            if (delta || finishReason) {
              yield { delta: delta ?? '', finishReason }
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  } finally {
    clearTimeout(timeout)
  }
}
