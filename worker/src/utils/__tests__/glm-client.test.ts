import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { glmChat, glmChatStream } from '../glm-client'

// ─── Tests ──────────────────────────────────────────────────

describe('glmChat', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('sends correct request format', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }), { status: 200 }))

    await glmChat({
      apiKey: 'test-key',
      messages: [{ role: 'user', content: 'Hi' }],
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://open.bigmodel.cn/api/paas/v4/chat/completions')
    expect(init?.method).toBe('POST')

    const headers = init?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-key')
    expect(headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(init?.body as string)
    expect(body.model).toBe('glm-4.7-flash')
    expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }])
    expect(body.stream).toBe(false)
    expect(body.temperature).toBe(0.7)
    expect(body.max_tokens).toBe(2048)
  })

  it('parses successful response correctly', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      choices: [{ message: { content: 'Test response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }), { status: 200 }))

    const result = await glmChat({
      apiKey: 'test-key',
      messages: [{ role: 'user', content: 'Test' }],
    })

    expect(result.content).toBe('Test response')
    expect(result.finishReason).toBe('stop')
    expect(result.tokenUsage.promptTokens).toBe(10)
    expect(result.tokenUsage.completionTokens).toBe(5)
    expect(result.tokenUsage.totalTokens).toBe(15)
  })

  it('uses custom model and parameters', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }), { status: 200 }))

    await glmChat({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
      model: 'glm-4',
      temperature: 0.3,
      maxTokens: 100,
    })

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.model).toBe('glm-4')
    expect(body.temperature).toBe(0.3)
    expect(body.max_tokens).toBe(100)
  })

  it('throws on HTTP error', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

    await expect(glmChat({
      apiKey: 'bad-key',
      messages: [{ role: 'user', content: 'Test' }],
    })).rejects.toThrow('GLM API error 401')
  })

  it('throws on missing choices', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      choices: [],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }), { status: 200 }))

    await expect(glmChat({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
    })).rejects.toThrow('GLM API returned no choices')
  })
})

describe('glmChatStream', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  function createSseStream(chunks: string[]): ReadableStream {
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk))
        }
        controller.close()
      },
    })
  }

  it('yields delta chunks from SSE lines', async () => {
    const sseData = [
      'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ]

    fetchSpy.mockResolvedValueOnce(new Response(createSseStream(sseData), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))

    const chunks: { delta: string; finishReason: string | null }[] = []
    for await (const chunk of glmChatStream({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
    })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { delta: 'Hello', finishReason: null },
      { delta: ' world', finishReason: null },
      { delta: '', finishReason: 'stop' },
    ])
  })

  it('handles [DONE] termination', async () => {
    const sseData = [
      'data: {"choices":[{"delta":{"content":"OK"},"finish_reason":null}]}\n\n',
      'data: [DONE]\n\n',
    ]

    fetchSpy.mockResolvedValueOnce(new Response(createSseStream(sseData), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))

    const chunks: { delta: string; finishReason: string | null }[] = []
    for await (const chunk of glmChatStream({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
    })) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
    expect(chunks[0].delta).toBe('OK')
  })

  it('throws on HTTP error before streaming', async () => {
    fetchSpy.mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    const collect = async () => {
      const chunks: unknown[] = []
      for await (const chunk of glmChatStream({
        apiKey: 'key',
        messages: [{ role: 'user', content: 'Test' }],
      })) {
        chunks.push(chunk)
      }
      return chunks
    }

    await expect(collect()).rejects.toThrow('GLM API stream error 401')
  })

  it('sends stream: true in request body', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(createSseStream(['data: [DONE]\n\n']), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))

    // Consume the generator
    for await (const _ of glmChatStream({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
    })) {
      // consume
    }

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.stream).toBe(true)
  })
})

describe('glmChat retry', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    vi.useFakeTimers()
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.useRealTimers()
  })

  function okResponse(content: string) {
    return new Response(JSON.stringify({
      choices: [{ message: { content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    }), { status: 200 })
  }

  it('retries on 429 and succeeds', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('Rate limited', { status: 429 }))
      .mockResolvedValueOnce(okResponse('Recovered'))

    const resultPromise = glmChat({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
    })

    // Advance past the retry delay
    await vi.advanceTimersByTimeAsync(1100)

    const result = await resultPromise
    expect(result.content).toBe('Recovered')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('retries on 500 and succeeds', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
      .mockResolvedValueOnce(okResponse('OK'))

    const resultPromise = glmChat({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
    })

    await vi.advanceTimersByTimeAsync(1100)

    const result = await resultPromise
    expect(result.content).toBe('OK')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('does not retry on 401', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

    await expect(glmChat({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
    })).rejects.toThrow('GLM API error 401')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('gives up after max retries', async () => {
    fetchSpy.mockResolvedValue(new Response('Server Error', { status: 500 }))

    const resultPromise = glmChat({
      apiKey: 'key',
      messages: [{ role: 'user', content: 'Test' }],
    }).catch((e) => e) // Catch to prevent unhandled rejection

    // Advance past all retry delays (1s + 2s + 4s = 7s)
    await vi.advanceTimersByTimeAsync(8000)

    const error = await resultPromise
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('GLM API error 500')
    expect(fetchSpy).toHaveBeenCalledTimes(4) // initial + 3 retries
  })
})
