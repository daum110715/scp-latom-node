import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AiQueueDo } from '../ai-queue'
import type { Env } from '../../types'

// ─── Mocks ──────────────────────────────────────────────────

function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    DB: { prepare: vi.fn(() => ({ bind: vi.fn(() => ({ first: vi.fn(async () => null), all: vi.fn(async () => ({ results: [] })), run: vi.fn(async () => ({})) })) })) } as unknown as D1Database,
    JWT_SECRET: 'test',
    CORS_ORIGINS: '*',
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    AI_CHAT_DO: {
      idFromName: vi.fn(() => 'mock-chat-id' as unknown as DurableObjectId),
      get: vi.fn(() => ({
        fetch: vi.fn(async (url: string) => {
          if (url.includes('/stream')) {
            const encoder = new TextEncoder()
            const stream = new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode('data: {"delta":"Hi"}\n\n'))
                controller.enqueue(encoder.encode('data: {"message":{"id":"msg-1","role":"assistant","content":"Hi","createdAt":"2025-01-01T00:00:01Z"},"done":true}\n\n'))
                controller.close()
              },
            })
            return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
          }
          return Response.json({
            success: true,
            conversationId: 'conv-1',
            message: { id: 'msg-1', role: 'assistant', content: 'Hello!', createdAt: '2025-01-01T00:00:01Z' },
            title: 'Test',
          })
        }),
      })),
    } as unknown as DurableObjectNamespace,
    AI_QUEUE_DO: {} as DurableObjectNamespace,
    GLM_API_KEY: 'test-key',
    ...overrides,
  } as Env
}

function createState(): DurableObjectState {
  return {
    storage: { sql: { exec: vi.fn() } },
    blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
  } as unknown as DurableObjectState
}

// ─── Tests ──────────────────────────────────────────────────

describe('AiQueueDo', () => {
  let env: Env

  beforeEach(() => {
    env = createMockEnv()
  })

  describe('GET /status', () => {
    it('returns queue status', async () => {
      const doInstance = new AiQueueDo(createState(), env)
      const res = await doInstance.fetch(new Request('https://queue.ai/status'))
      const data = await res.json() as any

      expect(data.success).toBe(true)
      expect(data.queueLength).toBe(0)
      expect(data.processing).toBe(false)
    })
  })

  describe('POST /chat', () => {
    it('processes a non-streaming request immediately', async () => {
      const doInstance = new AiQueueDo(createState(), env)

      const res = await doInstance.fetch(new Request('https://queue.ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'conv-1',
          message: 'Hello',
          userId: 1,
          isNew: true,
          stream: false,
        }),
      }))

      const data = await res.json() as any
      expect(data.success).toBe(true)
      expect(data.message.content).toBe('Hello!')
    })

    it('processes a streaming request', async () => {
      const doInstance = new AiQueueDo(createState(), env)

      const res = await doInstance.fetch(new Request('https://queue.ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'conv-1',
          message: 'Hello',
          userId: 1,
          isNew: true,
          stream: true,
        }),
      }))

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/event-stream')

      // Read the stream
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      const chunks: string[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(decoder.decode(value, { stream: true }))
      }
      const full = chunks.join('')
      expect(full).toContain('"delta":"Hi"')
      expect(full).toContain('"done":true')
    })

    it('returns error for missing conversationId', async () => {
      const doInstance = new AiQueueDo(createState(), env)

      const res = await doInstance.fetch(new Request('https://queue.ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
          userId: 1,
        }),
      }))

      expect(res.status).toBe(400)
      const data = await res.json() as any
      expect(data.error).toContain('Missing conversationId')
    })

    it('processes requests serially', async () => {
      const callOrder: number[] = []

      // Override env with a mock that tracks call order
      const chatDoFetch = vi.fn(async (url: string) => {
        const body = JSON.parse(url.includes('/stream') ? '{}' : '{}')
        // Simulate async delay
        const id = callOrder.length + 1
        callOrder.push(id)
        await new Promise((r) => setTimeout(r, 10))
        return Response.json({
          success: true,
          conversationId: 'conv-1',
          message: { id: `msg-${id}`, role: 'assistant', content: `Response ${id}`, createdAt: '2025-01-01T00:00:01Z' },
          title: 'Test',
        })
      })

      env = createMockEnv({
        AI_CHAT_DO: {
          idFromName: vi.fn(() => 'mock-id' as unknown as DurableObjectId),
          get: vi.fn(() => ({ fetch: chatDoFetch })),
        } as unknown as DurableObjectNamespace,
      })

      const doInstance = new AiQueueDo(createState(), env)

      // Fire 3 requests concurrently
      const promises = [1, 2, 3].map((i) =>
        doInstance.fetch(new Request('https://queue.ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: `conv-${i}`,
            message: `Message ${i}`,
            userId: 1,
            stream: false,
          }),
        }))
      )

      const results = await Promise.all(promises)

      // All should succeed
      for (const res of results) {
        const data = await res.json() as any
        expect(data.success).toBe(true)
      }

      // They should have been processed in order (FIFO)
      expect(callOrder).toEqual([1, 2, 3])
    })

    it('returns 404 for unknown paths', async () => {
      const doInstance = new AiQueueDo(createState(), env)
      const res = await doInstance.fetch(new Request('https://queue.ai/unknown'))
      expect(res.status).toBe(404)
    })

    it('returns 504 when task times out', async () => {
      vi.useFakeTimers()

      // Mock a DO that never resolves
      env = createMockEnv({
        AI_CHAT_DO: {
          idFromName: vi.fn(() => 'mock-id' as unknown as DurableObjectId),
          get: vi.fn(() => ({
            fetch: vi.fn(() => new Promise(() => {})), // never resolves
          })),
        } as unknown as DurableObjectNamespace,
      })

      const doInstance = new AiQueueDo(createState(), env)

      const resPromise = doInstance.fetch(new Request('https://queue.ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'conv-1',
          message: 'Hello',
          userId: 1,
          stream: false,
        }),
      }))

      // Advance past the 60s timeout
      await vi.advanceTimersByTimeAsync(61_000)

      const res = await resPromise
      expect(res.status).toBe(504)
      const data = await res.json() as any
      expect(data.error).toContain('timed out')

      vi.useRealTimers()
    })
  })
})
