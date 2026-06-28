import { apiGet, apiPost, apiPut, apiDelete } from './api'
import { API_URL } from './config'
import type { ApiResult } from './response'

// ─── Types ──────────────────────────────────────────────────

export interface AiMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  createdAt: string
  tokenCount?: number
}

export interface AiConversationMeta {
  id: string
  title: string
  systemPrompt: string
  messageCount: number
  lastMessageAt: string
  createdAt: string
}

export interface AiConversationDetail extends AiConversationMeta {
  messages: AiMessage[]
}

export interface AiConversationsListResponse {
  conversations: AiConversationMeta[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AiChatResponse {
  conversationId: string
  message: AiMessage
  title: string
}

// ─── API Functions ──────────────────────────────────────────

export function sendChatMessage(data: {
  conversationId?: string
  message: string
  systemPrompt?: string
  title?: string
}): Promise<ApiResult<AiChatResponse>> {
  return apiPost<AiChatResponse>('/ai/chat', data)
}

export function fetchConversations(
  params?: { page?: number; limit?: number }
): Promise<ApiResult<AiConversationsListResponse>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const query = searchParams.toString()
  return apiGet<AiConversationsListResponse>(`/ai/conversations${query ? `?${query}` : ''}`)
}

export function fetchConversation(
  id: string
): Promise<ApiResult<{ conversation: AiConversationDetail }>> {
  return apiGet<{ conversation: AiConversationDetail }>(`/ai/conversations/${id}`)
}

export function updateConversation(
  id: string,
  data: { title?: string; systemPrompt?: string }
): Promise<ApiResult<{ success: boolean }>> {
  return apiPut(`/ai/conversations/${id}`, data)
}

export function deleteConversation(
  id: string
): Promise<ApiResult<{ success: boolean }>> {
  return apiDelete(`/ai/conversations/${id}`)
}

export function regenerateMessage(
  id: string
): Promise<ApiResult<{ message: AiMessage }>> {
  return apiPost<{ message: AiMessage }>(`/ai/conversations/${id}/regenerate`)
}

// ─── Streaming ──────────────────────────────────────────────

export interface AiStreamCallbacks {
  onMetadata?: (data: { conversationId: string; title: string }) => void
  onChunk?: (delta: string) => void
  onDone?: (message: AiMessage) => void
  onError?: (error: string) => void
}

export async function sendChatMessageStream(
  data: {
    conversationId?: string
    message: string
    systemPrompt?: string
    title?: string
  },
  callbacks: AiStreamCallbacks
): Promise<void> {
  const token = localStorage.getItem('scp-auth-token')

  const res = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...data, stream: true }),
  })

  if (!res.ok || !res.body) {
    callbacks.onError?.(`HTTP ${res.status}`)
    return
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
        const json = trimmed.slice(6)
        if (json === '[DONE]') return

        try {
          const parsed = JSON.parse(json)
          if (parsed.conversationId) {
            callbacks.onMetadata?.({
              conversationId: parsed.conversationId,
              title: parsed.title,
            })
          }
          if (parsed.delta) {
            callbacks.onChunk?.(parsed.delta)
          }
          if (parsed.done && parsed.message) {
            callbacks.onDone?.(parsed.message)
          }
          if (parsed.error) {
            callbacks.onError?.(parsed.error)
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
