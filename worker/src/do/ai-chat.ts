import { glmChat, glmChatStream } from '../utils/glm-client'
import { Logger } from '../utils/logger'
import type { Env, AiMessage, AiConversationMeta } from '../types'

const MAX_CONTEXT_MESSAGES = 50

export class AiChatDo {
  private state: DurableObjectState
  private env: Env
  private logger: Logger
  private initialized = false

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.logger = new Logger({ db: env.DB, level: env.LOG_LEVEL as any })
  }

  async fetch(request: Request): Promise<Response> {
    await this.state.blockConcurrencyWhile(async () => {
      if (!this.initialized) {
        await this.ensureSchema()
        this.initialized = true
      }
    })

    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    try {
      // POST routes
      if (method === 'POST' && path === '/send') {
        return await this.handleSendMessage(await request.json())
      }
      if (method === 'POST' && path === '/stream') {
        return await this.handleStreamMessage(await request.json())
      }
      if (method === 'POST' && path === '/regenerate') {
        return await this.handleRegenerate()
      }
      // GET routes
      if (method === 'GET' && path === '/messages') {
        return await this.handleGetMessages()
      }
      if (method === 'GET' && path === '/meta') {
        return await this.handleGetMeta()
      }
      // PUT routes
      if (method === 'PUT' && path === '/meta') {
        return await this.handleUpdateMeta(await request.json())
      }
      // DELETE routes
      if (method === 'DELETE' && path === '/') {
        return this.json({ success: true })
      }

      return this.json({ success: false, error: 'Not found' }, 404)
    } catch (err) {
      this.logger.error('AiChatDo error', { error: err instanceof Error ? err.message : String(err) })
      return this.json({ success: false, error: 'Internal error' }, 500)
    }
  }

  // ─── Schema ────────────────────────────────────────────────

  private async ensureSchema(): Promise<void> {
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        token_count INTEGER
      )
    `)
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS conversation_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
  }

  // ─── Meta helpers ──────────────────────────────────────────

  private async getMeta(key: string): Promise<string | null> {
    const cursor = this.state.storage.sql.exec(
      'SELECT value FROM conversation_meta WHERE key = ?',
      key
    )
    const rows = [...cursor]
    return rows.length > 0 ? (rows[0].value as string) : null
  }

  private async setMeta(key: string, value: string): Promise<void> {
    this.state.storage.sql.exec(
      'INSERT OR REPLACE INTO conversation_meta (key, value) VALUES (?, ?)',
      key,
      value
    )
  }

  private async getAllMeta(): Promise<Record<string, string>> {
    const cursor = this.state.storage.sql.exec('SELECT key, value FROM conversation_meta')
    const result: Record<string, string> = {}
    for (const row of cursor) {
      result[row.key as string] = row.value as string
    }
    return result
  }

  // ─── Message helpers ───────────────────────────────────────

  private async getMessages(): Promise<AiMessage[]> {
    const cursor = this.state.storage.sql.exec(
      'SELECT id, role, content, created_at, token_count FROM messages ORDER BY rowid ASC'
    )
    const messages: AiMessage[] = []
    for (const row of cursor) {
      messages.push({
        id: row.id as string,
        role: row.role as 'system' | 'user' | 'assistant',
        content: row.content as string,
        createdAt: row.created_at as string,
        tokenCount: row.token_count != null ? Number(row.token_count) : undefined,
      })
    }
    return messages
  }

  private async getMessageCount(): Promise<number> {
    const cursor = this.state.storage.sql.exec('SELECT COUNT(*) as cnt FROM messages')
    const rows = [...cursor]
    return rows.length > 0 ? Number(rows[0].cnt) : 0
  }

  private async appendMessage(role: 'system' | 'user' | 'assistant', content: string, tokenCount?: number): Promise<AiMessage> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    this.state.storage.sql.exec(
      'INSERT INTO messages (id, role, content, created_at, token_count) VALUES (?, ?, ?, ?, ?)',
      id,
      role,
      content,
      now,
      tokenCount ?? null
    )
    return { id, role, content, createdAt: now, tokenCount }
  }

  private async deleteLastAssistantMessage(): Promise<boolean> {
    const cursor = this.state.storage.sql.exec(
      "SELECT id FROM messages WHERE role = 'assistant' ORDER BY rowid DESC LIMIT 1"
    )
    const rows = [...cursor]
    if (rows.length === 0) return false
    this.state.storage.sql.exec('DELETE FROM messages WHERE id = ?', rows[0].id as string)
    return true
  }

  private async buildGlmMessages(): Promise<{ role: 'system' | 'user' | 'assistant'; content: string }[]> {
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = []

    const systemPrompt = await this.getMeta('systemPrompt')
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    const history = await this.getMessages()
    // Truncate to last N messages to stay within context window
    const truncated = history.slice(-MAX_CONTEXT_MESSAGES)
    for (const msg of truncated) {
      messages.push({ role: msg.role, content: msg.content })
    }

    return messages
  }

  private generateTitle(firstMessage: string): string {
    const cleaned = firstMessage.replace(/[\r\n]+/g, ' ').trim()
    return cleaned.length > 50 ? cleaned.slice(0, 50) + '…' : cleaned
  }

  // ─── Handlers ──────────────────────────────────────────────

  private async handleSendMessage(body: {
    message: string
    userId?: number
    systemPrompt?: string
    title?: string
    isNew?: boolean
    conversationId?: string
  }): Promise<Response> {
    const { message, userId, systemPrompt, title, isNew, conversationId } = body

    // Initialize conversation meta if new
    if (isNew) {
      if (systemPrompt) await this.setMeta('systemPrompt', systemPrompt)
      if (userId != null) await this.setMeta('userId', String(userId))
      await this.setMeta('title', title || this.generateTitle(message))
      await this.setMeta('createdAt', new Date().toISOString())
    }

    // Append user message
    await this.appendMessage('user', message)

    // Build context and call GLM
    const glmMessages = await this.buildGlmMessages()
    let result
    try {
      result = await glmChat({
        apiKey: this.env.GLM_API_KEY,
        messages: glmMessages,
      })
    } catch (err) {
      this.logger.error('GLM API call failed', { error: err instanceof Error ? err.message : String(err) })
      return this.json({
        success: false,
        error: 'AI service unavailable. Please try again later.',
      }, 502)
    }

    // Append assistant message
    const assistantMsg = await this.appendMessage('assistant', result.content, result.tokenUsage.completionTokens)

    // Update meta
    await this.setMeta('lastMessageAt', new Date().toISOString())
    const count = await this.getMessageCount()
    await this.setMeta('messageCount', String(count))

    const meta = await this.getAllMeta()

    return this.json({
      success: true,
      conversationId: conversationId ?? '',
      message: assistantMsg,
      title: meta.title ?? 'New Conversation',
    })
  }

  private async handleStreamMessage(body: {
    message: string
    userId?: number
    systemPrompt?: string
    title?: string
    isNew?: boolean
    conversationId?: string
  }): Promise<Response> {
    const { message, userId, systemPrompt, title, isNew, conversationId } = body

    // Initialize conversation meta if new
    if (isNew) {
      if (systemPrompt) await this.setMeta('systemPrompt', systemPrompt)
      if (userId != null) await this.setMeta('userId', String(userId))
      await this.setMeta('title', title || this.generateTitle(message))
      await this.setMeta('createdAt', new Date().toISOString())
    }

    // Append user message
    await this.appendMessage('user', message)

    // Build context
    const glmMessages = await this.buildGlmMessages()
    const meta = await this.getAllMeta()

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    const writeSse = async (data: Record<string, unknown>) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    }

    // Send initial metadata event
    writeSse({
      conversationId: conversationId ?? '',
      title: meta.title ?? 'New Conversation',
    }).then(() => {
      // Run GLM stream in background
      ;(async () => {
        let fullContent = ''
        try {
          for await (const chunk of glmChatStream({
            apiKey: this.env.GLM_API_KEY,
            messages: glmMessages,
          })) {
            fullContent += chunk.delta
            await writeSse({ delta: chunk.delta })
          }

          // Persist the complete message
          const assistantMsg = await this.appendMessage('assistant', fullContent)
          await this.setMeta('lastMessageAt', new Date().toISOString())
          const count = await this.getMessageCount()
          await this.setMeta('messageCount', String(count))

          await writeSse({ message: assistantMsg, done: true })
        } catch (err) {
          this.logger.error('GLM stream failed', { error: err instanceof Error ? err.message : String(err) })
          await writeSse({ error: 'Stream failed' })
        } finally {
          await writer.close()
        }
      })()
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  private async handleGetMessages(): Promise<Response> {
    const messages = await this.getMessages()
    return this.json({ success: true, messages })
  }

  private async handleGetMeta(): Promise<Response> {
    const meta = await this.getAllMeta()
    const messageCount = await this.getMessageCount()
    return this.json({
      success: true,
      meta: {
        title: meta.title ?? 'New Conversation',
        systemPrompt: meta.systemPrompt ?? '',
        userId: meta.userId ? Number(meta.userId) : 0,
        messageCount,
        lastMessageAt: meta.lastMessageAt ?? meta.createdAt ?? '',
        createdAt: meta.createdAt ?? '',
        updatedAt: meta.updatedAt ?? '',
      },
    })
  }

  private async handleUpdateMeta(body: { title?: string; systemPrompt?: string }): Promise<Response> {
    if (body.title !== undefined) {
      await this.setMeta('title', body.title)
    }
    if (body.systemPrompt !== undefined) {
      await this.setMeta('systemPrompt', body.systemPrompt)
    }
    await this.setMeta('updatedAt', new Date().toISOString())
    return this.json({ success: true })
  }

  private async handleRegenerate(): Promise<Response> {
    // Delete the last assistant message
    const deleted = await this.deleteLastAssistantMessage()
    if (!deleted) {
      return this.json({ success: false, error: 'No assistant message to regenerate' }, 400)
    }

    // Re-call GLM with remaining history
    const glmMessages = await this.buildGlmMessages()
    let result
    try {
      result = await glmChat({
        apiKey: this.env.GLM_API_KEY,
        messages: glmMessages,
      })
    } catch (err) {
      this.logger.error('GLM regenerate failed', { error: err instanceof Error ? err.message : String(err) })
      return this.json({
        success: false,
        error: 'AI service unavailable. Please try again later.',
      }, 502)
    }

    const assistantMsg = await this.appendMessage('assistant', result.content, result.tokenUsage.completionTokens)
    await this.setMeta('lastMessageAt', new Date().toISOString())

    return this.json({ success: true, message: assistantMsg })
  }

  // ─── Helpers ───────────────────────────────────────────────

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
