import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AiChatDo } from '../ai-chat'
import {
  createMockD1Database,
  createMockNamespace,
  createMockEnv,
  createMockDurableObjectState,
} from '../../test-helpers'
import type { Env } from '../../types'

// ─── Mocks ──────────────────────────────────────────────────

vi.mock('../../utils/glm-client', () => ({
  glmChat: vi.fn(),
  glmChatStream: vi.fn(),
}))

import { glmChat, glmChatStream } from '../../utils/glm-client'
const mockGlmChat = vi.mocked(glmChat)
const _mockGlmChatStream = vi.mocked(glmChatStream)

function createMockSqlStorage() {
  const tables: Record<string, Record<string, unknown>[]> = {
    messages: [],
    conversation_meta: [],
  }

  return {
    exec: vi.fn((sql: string, ...params: unknown[]) => {
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase()

      // CREATE TABLE
      if (normalized.startsWith('create table')) {
        return { next: () => undefined }
      }

      // INSERT OR REPLACE INTO conversation_meta
      if (
        normalized.startsWith('insert or replace into conversation_meta') ||
        normalized.startsWith('insert into conversation_meta')
      ) {
        const [key, value] = params
        const existing = tables.conversation_meta.findIndex((r: any) => r.key === key)
        if (existing >= 0) {
          tables.conversation_meta[existing] = { key, value }
        } else {
          tables.conversation_meta.push({ key, value })
        }
        return { next: () => undefined }
      }

      // INSERT INTO messages
      if (normalized.startsWith('insert into messages')) {
        const [id, role, content, created_at, token_count] = params
        tables.messages.push({ id, role, content, created_at, token_count })
        return { next: () => undefined }
      }

      // SELECT ... FROM conversation_meta (with or without WHERE)
      if (normalized.includes('from conversation_meta')) {
        if (normalized.includes('where') && params.length > 0) {
          // Single key lookup: SELECT value FROM conversation_meta WHERE key = ?
          const keyParam = params[0]
          const rows = tables.conversation_meta.filter((r: any) => r.key === keyParam)
          return {
            [Symbol.iterator]: function* () {
              for (const row of rows) yield row
            },
          }
        }
        // All meta: SELECT key, value FROM conversation_meta
        return {
          [Symbol.iterator]: function* () {
            for (const row of tables.conversation_meta) yield row
          },
        }
      }

      // SELECT COUNT(*) FROM messages
      if (normalized.includes('from messages') && normalized.includes('count(*)')) {
        const cnt = tables.messages.length
        return {
          [Symbol.iterator]: function* () {
            yield { cnt }
          },
        }
      }

      // SELECT ... FROM messages
      if (normalized.includes('from messages')) {
        return {
          [Symbol.iterator]: function* () {
            for (const row of tables.messages) yield row
          },
        }
      }

      // DELETE FROM messages
      if (normalized.startsWith('delete from messages')) {
        const id = params[0]
        const idx = tables.messages.findIndex((r: any) => r.id === id)
        if (idx >= 0) tables.messages.splice(idx, 1)
        return { next: () => undefined }
      }

      return { [Symbol.iterator]: function* () {}, next: () => undefined }
    }),
  }
}

function createMockStorage() {
  return {
    sql: createMockSqlStorage(),
    get: vi.fn(async () => null),
    put: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    setAlarm: vi.fn(async () => {}),
    getAlarm: vi.fn(async () => null),
  }
}

function createChatMockEnv(overrides?: Partial<Env>): Env {
  return createMockEnv({
    DB: createMockD1Database(),
    JWT_SECRET: 'test',
    GLM_API_KEY: 'test-glm-key',
    ...overrides,
  })
}

function createChatMockState(): DurableObjectState {
  const storage = createMockStorage()
  return {
    storage,
    id: 'mock-ai-do-id',
    blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as DurableObjectState
}

// ─── Tests ──────────────────────────────────────────────────

describe('AiChatDo', () => {
  let env: Env

  beforeEach(() => {
    env = createChatMockEnv()
    vi.clearAllMocks()
  })

  describe('fetch handler', () => {
    it('returns 404 for unknown paths', async () => {
      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)
      const req = new Request('https://do.ai/unknown')
      const res = await doInstance.fetch(req)
      expect(res.status).toBe(404)
    })

    it('initializes schema on first fetch', async () => {
      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)
      const req = new Request('https://do.ai/messages')
      await doInstance.fetch(req)
      expect(state.blockConcurrencyWhile).toHaveBeenCalled()
    })
  })

  describe('POST /send', () => {
    it('creates new conversation and returns assistant message', async () => {
      mockGlmChat.mockResolvedValueOnce({
        content: 'I am SAGE, the Foundation AI.',
        tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: 'stop',
      })

      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)
      const req = new Request('https://do.ai/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Who are you?',
          userId: 1,
          systemPrompt: 'You are SAGE.',
          title: 'Test Chat',
          isNew: true,
          conversationId: 'test-id',
        }),
      })

      const res = await doInstance.fetch(req)
      const data = (await res.json()) as any

      expect(data.success).toBe(true)
      expect(data.message.role).toBe('assistant')
      expect(data.message.content).toBe('I am SAGE, the Foundation AI.')
      expect(data.title).toBe('Test Chat')
      expect(mockGlmChat).toHaveBeenCalledTimes(1)
    })

    it('appends to existing conversation history', async () => {
      mockGlmChat.mockResolvedValue({
        content: 'Response',
        tokenUsage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        finishReason: 'stop',
      })

      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      // First message
      const req1 = new Request('https://do.ai/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
          userId: 1,
          systemPrompt: 'You are SAGE.',
          title: 'Test',
          isNew: true,
          conversationId: 'test-id',
        }),
      })
      await doInstance.fetch(req1)

      // Second message
      const req2 = new Request('https://do.ai/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Tell me more',
          isNew: false,
          conversationId: 'test-id',
        }),
      })
      await doInstance.fetch(req2)

      // The GLM call should include history
      const lastCall = mockGlmChat.mock.calls[1][0]
      expect(lastCall.messages.length).toBeGreaterThan(1)
    })

    it('returns 502 on GLM API failure', async () => {
      // Both the tool-enabled call and the fallback without tools fail
      mockGlmChat.mockRejectedValue(new Error('API down'))

      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)
      const req = new Request('https://do.ai/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test',
          userId: 1,
          systemPrompt: 'SAGE',
          isNew: true,
          conversationId: 'test-id',
        }),
      })

      const res = await doInstance.fetch(req)
      expect(res.status).toBe(502)
      const data = (await res.json()) as any
      expect(data.success).toBe(false)
      expect(data.error).toContain('unavailable')
    })
  })

  describe('GET /messages', () => {
    it('returns all messages in order', async () => {
      mockGlmChat.mockResolvedValueOnce({
        content: 'Response',
        tokenUsage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        finishReason: 'stop',
      })

      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      // Send a message first
      await doInstance.fetch(
        new Request('https://do.ai/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Hello',
            userId: 1,
            systemPrompt: 'SAGE',
            isNew: true,
            conversationId: 'test-id',
          }),
        }),
      )

      // Get messages
      const res = await doInstance.fetch(new Request('https://do.ai/messages'))
      const data = (await res.json()) as any

      expect(data.success).toBe(true)
      expect(data.messages).toHaveLength(2)
      expect(data.messages[0].role).toBe('user')
      expect(data.messages[0].content).toBe('Hello')
      expect(data.messages[1].role).toBe('assistant')
      expect(data.messages[1].content).toBe('Response')
    })
  })

  describe('GET /meta', () => {
    it('returns conversation metadata', async () => {
      mockGlmChat.mockResolvedValueOnce({
        content: 'OK',
        tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        finishReason: 'stop',
      })

      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      await doInstance.fetch(
        new Request('https://do.ai/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Hello',
            userId: 1,
            systemPrompt: 'SAGE',
            title: 'My Chat',
            isNew: true,
            conversationId: 'test-id',
          }),
        }),
      )

      const res = await doInstance.fetch(new Request('https://do.ai/meta'))
      const data = (await res.json()) as any

      expect(data.success).toBe(true)
      expect(data.meta.title).toBe('My Chat')
      expect(data.meta.systemPrompt).toBe('SAGE')
      expect(data.meta.messageCount).toBe(2)
    })
  })

  describe('PUT /meta', () => {
    it('updates title and systemPrompt', async () => {
      mockGlmChat.mockResolvedValueOnce({
        content: 'OK',
        tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        finishReason: 'stop',
      })

      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      // Create conversation
      await doInstance.fetch(
        new Request('https://do.ai/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Hello',
            userId: 1,
            systemPrompt: 'Old prompt',
            title: 'Old title',
            isNew: true,
            conversationId: 'test-id',
          }),
        }),
      )

      // Update meta
      const res = await doInstance.fetch(
        new Request('https://do.ai/meta', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New title', systemPrompt: 'New prompt' }),
        }),
      )

      const data = (await res.json()) as any
      expect(data.success).toBe(true)

      // Verify update — title is updated, systemPrompt is NOT (server-controlled)
      const metaRes = await doInstance.fetch(new Request('https://do.ai/meta'))
      const metaData = (await metaRes.json()) as any
      expect(metaData.meta.title).toBe('New title')
      expect(metaData.meta.systemPrompt).toBe('Old prompt')
    })
  })

  describe('POST /regenerate', () => {
    it('deletes last assistant message and generates new one', async () => {
      mockGlmChat.mockResolvedValue({
        content: 'First response',
        tokenUsage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        finishReason: 'stop',
      })

      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      // Create conversation
      await doInstance.fetch(
        new Request('https://do.ai/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Hello',
            userId: 1,
            systemPrompt: 'SAGE',
            isNew: true,
            conversationId: 'test-id',
          }),
        }),
      )

      // Change mock response for regenerate
      mockGlmChat.mockResolvedValueOnce({
        content: 'Regenerated response',
        tokenUsage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        finishReason: 'stop',
      })

      const res = await doInstance.fetch(
        new Request('https://do.ai/regenerate', {
          method: 'POST',
        }),
      )

      const data = (await res.json()) as any
      expect(data.success).toBe(true)
      expect(data.message.content).toBe('Regenerated response')
      expect(data.message.role).toBe('assistant')
    })

    it('returns error when no assistant message to regenerate', async () => {
      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      const res = await doInstance.fetch(
        new Request('https://do.ai/regenerate', {
          method: 'POST',
        }),
      )

      expect(res.status).toBe(400)
      const data = (await res.json()) as any
      expect(data.success).toBe(false)
    })
  })

  describe('DELETE /', () => {
    it('returns success', async () => {
      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      const res = await doInstance.fetch(
        new Request('https://do.ai/', {
          method: 'DELETE',
        }),
      )

      const data = (await res.json()) as any
      expect(data.success).toBe(true)
    })
  })

  describe('Input validation', () => {
    it('rejects messages exceeding max length', async () => {
      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)
      const longMessage = 'x'.repeat(4001)

      const res = await doInstance.fetch(
        new Request('https://do.ai/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: longMessage,
            userId: 1,
            systemPrompt: 'SAGE',
            isNew: true,
            conversationId: 'test-id',
          }),
        }),
      )

      expect(res.status).toBe(400)
      const data = (await res.json()) as any
      expect(data.error).toContain('maximum length')
    })

    it('rejects malformed JSON body', async () => {
      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      const res = await doInstance.fetch(
        new Request('https://do.ai/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'not valid json',
        }),
      )

      expect(res.status).toBe(400)
      const data = (await res.json()) as any
      expect(data.error).toContain('Invalid JSON')
    })

    it('rejects empty messages', async () => {
      const state = createChatMockState()
      const doInstance = new AiChatDo(state, env)

      const res = await doInstance.fetch(
        new Request('https://do.ai/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '',
            userId: 1,
            systemPrompt: 'SAGE',
            isNew: true,
            conversationId: 'test-id',
          }),
        }),
      )

      expect(res.status).toBe(400)
      const data = (await res.json()) as any
      expect(data.error).toContain('required')
    })
  })
})
