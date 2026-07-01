import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env } from '../../types'
import aiRoutes from '../ai'
import { signToken } from '../../utils/jwt'
import {
  createMockD1Database,
  createMockDurableObjectId,
  createMockNamespace,
  createMockEnv,
} from '../../test-helpers'

// ─── Mocks ──────────────────────────────────────────────────

const mockMessages = [
  { id: 'msg-1', role: 'user', content: 'Hello', createdAt: '2025-01-01T00:00:00Z' },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hi there!',
    createdAt: '2025-01-01T00:00:01Z',
    tokenCount: 5,
  },
]

function createMockDoResponse(path: string, method: string): Response {
  if (path === '/send' && method === 'POST') {
    return Response.json({
      success: true,
      conversationId: 'conv-123',
      message: mockMessages[1],
      title: 'Test Conversation',
    })
  }

  if (path === '/stream' && method === 'POST') {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"conversationId":"conv-123","title":"Test"}\n\n'))
        controller.enqueue(encoder.encode('data: {"delta":"Hi"}\n\n'))
        controller.enqueue(
          encoder.encode(
            'data: {"message":{"id":"msg-2","role":"assistant","content":"Hi","createdAt":"2025-01-01T00:00:01Z"},"done":true}\n\n',
          ),
        )
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  if (path === '/messages' && method === 'GET') {
    return Response.json({ success: true, messages: mockMessages })
  }

  if (path === '/meta' && method === 'GET') {
    return Response.json({
      success: true,
      meta: {
        title: 'Test Conversation',
        systemPrompt: 'You are SAGE.',
        messageCount: 2,
        lastMessageAt: '2025-01-01T00:00:01Z',
        createdAt: '2025-01-01T00:00:00Z',
      },
    })
  }

  if (path === '/meta' && method === 'PUT') {
    return Response.json({ success: true })
  }

  if (path === '/regenerate' && method === 'POST') {
    return Response.json({
      success: true,
      message: {
        id: 'msg-3',
        role: 'assistant',
        content: 'Regenerated',
        createdAt: '2025-01-01T00:00:02Z',
      },
    })
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404 })
}

function createAiMockNamespace(): DurableObjectNamespace {
  return createMockNamespace({
    idFromName: vi.fn(() => createMockDurableObjectId()),
    get: vi.fn(() => ({
      fetch: vi.fn((url: string, init?: RequestInit) => {
        const parsedUrl = new URL(url)
        return Promise.resolve(createMockDoResponse(parsedUrl.pathname, init?.method ?? 'GET'))
      }),
    })),
  })
}

function createAiMockDB(): D1Database {
  const conversations: Map<string, any> = new Map()

  return {
    prepare: vi.fn((sql: string) => {
      const stmt = {
        _sql: sql,
        _params: [] as any[],
        bind(...params: any[]) {
          stmt._params = params
          return stmt
        },
        first: vi.fn(async () => {
          if (sql.includes('COUNT(*)')) {
            return { total: conversations.size }
          }
          if (sql.includes('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?')) {
            const [id, userId] = stmt._params
            const conv = conversations.get(id)
            if (conv && conv.user_id === userId) return conv
            return null
          }
          if (sql.includes('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?')) {
            const [id, userId] = stmt._params
            const conv = conversations.get(id)
            if (conv && conv.user_id === userId) return { id: conv.id }
            return null
          }
          return null
        }),
        all: vi.fn(async () => {
          if (sql.includes('SELECT * FROM ai_conversations')) {
            return { results: Array.from(conversations.values()) }
          }
          return { results: [] }
        }),
        run: vi.fn(async () => {
          if (sql.includes('INSERT INTO ai_conversations')) {
            const [id, userId, title, systemPrompt] = stmt._params
            conversations.set(id, {
              id,
              user_id: userId,
              title,
              system_prompt: systemPrompt,
              message_count: 0,
              last_message_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
          if (sql.includes('DELETE FROM ai_conversations')) {
            const [id, userId] = stmt._params
            const conv = conversations.get(id)
            if (conv && conv.user_id === userId) {
              conversations.delete(id)
              return { meta: { changes: 1 } }
            }
            return { meta: { changes: 0 } }
          }
          return { meta: { changes: 1 } }
        }),
      }
      return stmt
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as D1Database
}

function createQueueMockNamespace(chatNs: DurableObjectNamespace): DurableObjectNamespace {
  return createMockNamespace({
    idFromName: vi.fn(() => createMockDurableObjectId('mock-queue-id')),
    get: vi.fn(() => ({
      fetch: vi.fn(async (url: string, init?: RequestInit) => {
        // Queue DO forwards to the chat DO
        const body = init?.body ? JSON.parse(init.body as string) : {}
        const chatStub = chatNs.get(createMockDurableObjectId())
        const doPath = body.stream ? 'https://do.ai/stream' : 'https://do.ai/send'
        return chatStub.fetch(doPath, init)
      }),
    })),
  })
}

function createAiTestEnv(overrides?: Partial<Env>): Env {
  const chatNs = createAiMockNamespace()
  return createMockEnv({
    DB: createAiMockDB(),
    JWT_SECRET: 'test-secret-key-for-jwt',
    AI_CHAT_DO: chatNs,
    AI_QUEUE_DO: createQueueMockNamespace(chatNs),
    GLM_API_KEY: 'test-glm-key',
    ...overrides,
  })
}

function createTestApp(_envOverrides?: Partial<Env>): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api/ai', aiRoutes)
  return app
}

async function getAuthToken(secret: string): Promise<string> {
  return signToken(
    {
      sub: 1,
      codename: 'test-agent',
      role: 'personnel',
      clearance: 2,
    },
    secret,
  )
}

// ─── Tests ──────────────────────────────────────────────────

describe('AI Routes', () => {
  let app: Hono<{ Bindings: Env }>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('POST /api/ai/chat', () => {
    it('returns 401 without auth token', async () => {
      const res = await app.request(
        '/api/ai/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Hello' }),
        },
        createAiTestEnv(),
      )

      expect(res.status).toBe(401)
    })

    it('returns 400 with empty message', async () => {
      const env = createAiTestEnv()
      const token = await getAuthToken(env.JWT_SECRET)

      const res = await app.request(
        '/api/ai/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: '' }),
        },
        env,
      )

      expect(res.status).toBe(400)
      const data = (await res.json()) as any
      expect(data.error).toContain('Message is required')
    })

    it('creates new conversation and returns response', async () => {
      const env = createAiTestEnv()
      const token = await getAuthToken(env.JWT_SECRET)

      const res = await app.request(
        '/api/ai/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: 'Hello' }),
        },
        env,
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.success).toBe(true)
      expect(data.message.role).toBe('assistant')
    })

    it('routes through per-user queue DO', async () => {
      const env = createAiTestEnv()
      const token = await getAuthToken(env.JWT_SECRET)

      const res = await app.request(
        '/api/ai/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: 'Follow up', conversationId: 'existing-id' }),
        },
        env,
      )

      expect(res.status).toBe(200)
      // Chat goes through the queue DO (per-user), not directly to AiChatDo
      const queueNs = env.AI_QUEUE_DO as any
      expect(queueNs.idFromName).toHaveBeenCalledWith('queue:user:1')
    })
  })

  describe('GET /api/ai/conversations', () => {
    it('returns 401 without auth', async () => {
      const res = await app.request('/api/ai/conversations', {}, createAiTestEnv())
      expect(res.status).toBe(401)
    })

    it('returns paginated conversation list', async () => {
      const env = createAiTestEnv()
      const token = await getAuthToken(env.JWT_SECRET)

      const res = await app.request(
        '/api/ai/conversations?page=1&limit=10',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.success).toBe(true)
      expect(data).toHaveProperty('conversations')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('page')
      expect(data).toHaveProperty('totalPages')
    })
  })

  describe('GET /api/ai/conversations/:id', () => {
    it('returns 404 for non-existent conversation', async () => {
      const env = createAiTestEnv()
      const token = await getAuthToken(env.JWT_SECRET)

      const res = await app.request(
        '/api/ai/conversations/nonexistent',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/ai/conversations/:id', () => {
    it('returns 404 for non-existent conversation', async () => {
      const env = createAiTestEnv()
      const token = await getAuthToken(env.JWT_SECRET)

      const res = await app.request(
        '/api/ai/conversations/nonexistent',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: 'New Title' }),
        },
        env,
      )

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/ai/conversations/:id', () => {
    it('returns 404 for non-existent conversation', async () => {
      const env = createAiTestEnv()
      const token = await getAuthToken(env.JWT_SECRET)

      const res = await app.request(
        '/api/ai/conversations/nonexistent',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/ai/conversations/:id/regenerate', () => {
    it('returns 404 for non-existent conversation', async () => {
      const env = createAiTestEnv()
      const token = await getAuthToken(env.JWT_SECRET)

      const res = await app.request(
        '/api/ai/conversations/nonexistent/regenerate',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )

      expect(res.status).toBe(404)
    })
  })
})
