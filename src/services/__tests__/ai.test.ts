import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiStream: vi.fn(),
}))

import {
  sendChatMessage,
  fetchConversations,
  fetchConversation,
  updateConversation,
  deleteConversation,
  regenerateMessage,
  sendChatMessageStream,
} from '../ai'
import { apiGet, apiPost, apiPut, apiDelete, apiStream } from '../api'

const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)
const mockApiPut = vi.mocked(apiPut)
const mockApiDelete = vi.mocked(apiDelete)
const mockApiStream = vi.mocked(apiStream)

describe('AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendChatMessage', () => {
    it('calls POST /ai/chat with message data', async () => {
      const data = { message: 'Tell me about SCP-173' }
      mockApiPost.mockResolvedValueOnce({
        ok: true,
        data: { conversationId: 'abc', message: {}, title: 'Chat' },
      } as any)
      await sendChatMessage(data)
      expect(mockApiPost).toHaveBeenCalledWith('/ai/chat', data)
    })

    it('includes optional fields', async () => {
      const data = {
        message: 'Hello',
        conversationId: 'existing-id',
        systemPrompt: 'You are helpful',
        title: 'My Chat',
      }
      mockApiPost.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await sendChatMessage(data)
      expect(mockApiPost).toHaveBeenCalledWith('/ai/chat', data)
    })
  })

  describe('fetchConversations', () => {
    it('calls GET /ai/conversations with no params', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { conversations: [] } } as any)
      await fetchConversations()
      expect(mockApiGet).toHaveBeenCalledWith('/ai/conversations')
    })

    it('includes pagination params', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await fetchConversations({ page: 2, limit: 10 })
      expect(mockApiGet).toHaveBeenCalledWith('/ai/conversations?page=2&limit=10')
    })
  })

  describe('fetchConversation', () => {
    it('calls GET /ai/conversations/:id', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { conversation: {} } } as any)
      await fetchConversation('conv-uuid-123')
      expect(mockApiGet).toHaveBeenCalledWith('/ai/conversations/conv-uuid-123')
    })
  })

  describe('updateConversation', () => {
    it('calls PUT /ai/conversations/:id', async () => {
      mockApiPut.mockResolvedValueOnce({ ok: true, data: { success: true } } as any)
      await updateConversation('conv-uuid-123', { title: 'New Title' })
      expect(mockApiPut).toHaveBeenCalledWith('/ai/conversations/conv-uuid-123', {
        title: 'New Title',
      })
    })

    it('supports systemPrompt update', async () => {
      mockApiPut.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await updateConversation('conv-uuid-123', { systemPrompt: 'New prompt' })
      expect(mockApiPut).toHaveBeenCalledWith('/ai/conversations/conv-uuid-123', {
        systemPrompt: 'New prompt',
      })
    })
  })

  describe('deleteConversation', () => {
    it('calls DELETE /ai/conversations/:id', async () => {
      mockApiDelete.mockResolvedValueOnce({ ok: true, data: { success: true } } as any)
      await deleteConversation('conv-uuid-123')
      expect(mockApiDelete).toHaveBeenCalledWith('/ai/conversations/conv-uuid-123')
    })
  })

  describe('regenerateMessage', () => {
    it('calls POST /ai/conversations/:id/regenerate', async () => {
      mockApiPost.mockResolvedValueOnce({ ok: true, data: { message: {} } } as any)
      await regenerateMessage('conv-uuid-123')
      expect(mockApiPost).toHaveBeenCalledWith('/ai/conversations/conv-uuid-123/regenerate')
    })
  })

  describe('sendChatMessageStream', () => {
    it('calls onError when apiStream returns error', async () => {
      mockApiStream.mockResolvedValueOnce({
        ok: false,
        code: 'ERR-500-SYSTEM',
        error: 'Server error',
      } as any)
      const callbacks = {
        onError: vi.fn(),
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onMetadata: vi.fn(),
      }

      await sendChatMessageStream({ message: 'Hello' }, callbacks)

      expect(mockApiStream).toHaveBeenCalledWith('/ai/chat', { message: 'Hello', stream: true })
      expect(callbacks.onError).toHaveBeenCalledWith('ERR-500-SYSTEM')
    })

    it('calls onError when response has no body', async () => {
      const mockResponse = new Response(null, { status: 200 })
      mockApiStream.mockResolvedValueOnce({ ok: true, response: mockResponse } as any)
      const callbacks = { onError: vi.fn() }

      await sendChatMessageStream({ message: 'Hello' }, callbacks)

      expect(callbacks.onError).toHaveBeenCalledWith('STREAM_NO_BODY')
    })

    it('processes SSE chunks correctly', async () => {
      const encoder = new TextEncoder()
      const chunks = [
        'data: {"delta":"Hello "}\n',
        'data: {"delta":"world"}\n',
        'data: {"done":true,"message":{"id":"1","role":"assistant","content":"Hello world","createdAt":"2026-06-26"}}\n',
        'data: [DONE]\n',
      ]

      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        },
      })

      const mockResponse = new Response(stream, { status: 200 })
      mockApiStream.mockResolvedValueOnce({ ok: true, response: mockResponse } as any)

      const callbacks = {
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn(),
      }

      await sendChatMessageStream({ message: 'Hello' }, callbacks)

      expect(callbacks.onChunk).toHaveBeenCalledWith('Hello ')
      expect(callbacks.onChunk).toHaveBeenCalledWith('world')
      expect(callbacks.onDone).toHaveBeenCalledWith({
        id: '1',
        role: 'assistant',
        content: 'Hello world',
        createdAt: '2026-06-26',
      })
      expect(callbacks.onError).not.toHaveBeenCalled()
    })

    it('handles metadata in SSE stream', async () => {
      const encoder = new TextEncoder()
      const chunks = ['data: {"conversationId":"new-uuid","title":"New Chat"}\n', 'data: [DONE]\n']

      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        },
      })

      const mockResponse = new Response(stream, { status: 200 })
      mockApiStream.mockResolvedValueOnce({ ok: true, response: mockResponse } as any)

      const callbacks = {
        onMetadata: vi.fn(),
        onChunk: vi.fn(),
      }

      await sendChatMessageStream({ message: 'Hello' }, callbacks)

      expect(callbacks.onMetadata).toHaveBeenCalledWith({
        conversationId: 'new-uuid',
        title: 'New Chat',
      })
    })

    it('handles error events in SSE stream', async () => {
      const encoder = new TextEncoder()
      const chunks = ['data: {"error":"Rate limit exceeded"}\n', 'data: [DONE]\n']

      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        },
      })

      const mockResponse = new Response(stream, { status: 200 })
      mockApiStream.mockResolvedValueOnce({ ok: true, response: mockResponse } as any)

      const callbacks = { onError: vi.fn() }

      await sendChatMessageStream({ message: 'Hello' }, callbacks)

      expect(callbacks.onError).toHaveBeenCalledWith('Rate limit exceeded')
    })
  })
})
