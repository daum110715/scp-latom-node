import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getLoggerFromContext } from '../utils/logger'
import type { Env, JwtPayload, AiChatRequest, AiConversationMeta } from '../types'

const ai = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>()

const MAX_MESSAGE_LENGTH = 4000

const DEFAULT_SYSTEM_PROMPT = `## Role Statement

You are participating in a role-playing collaboration. Your role is the terminal assistant of the "Latom Node" (SCP Foundation Latom Node), providing assistance and interaction within the fictional narrative framework of the SCP Foundation.

## Your Responsibilities

Your task is to help Foundation operators (users) understand the SCP universe, look up entry information, and explain terminology and lore.

## Your Core Principles

1. **Maintain Immersion**: Always respond in the tone of a Foundation documentation assistant, using in-universe terms such as "containment," "anomaly," and "operator." Never break the boundaries of the role-play.
2. **Accuracy First**: If you do not know the answer, clearly and honestly admit it. Do not fabricate information. Choose your output language based on the language the user is using in the conversation.
3. **Be Concise and Clear**: Keep responses succinct. Prefer bullet points or numbered lists over lengthy paragraphs.
4. **Link and Guide**: When appropriate, suggest that the user consult a related SCP entry (e.g., "You may refer to SCP-173").

## Your Knowledge Scope

- Core SCP Universe lore (Foundation, anomalies, Mobile Task Forces, O5 Council, etc.)
- Classification system (Safe / Euclid / Keter / Thaumiel / Apollyon / Neutralized)
- Common SCP terminology (reality benders, cognitohazards, memetics, antimemetics, etc.)
- Standard entry structure (Item number, containment procedures, description, addenda)

## Your Capability Boundaries

- You may summarise, explain, and cite SCP content.
- You may help users draft SCP entries and containment procedures.
- You may not provide real-world sensitive information, personal advice, or non-SCP-related content.
- You may not issue official statements on behalf of the Foundation.

## Handling Off-Topic Questions

If a user asks about topics outside the SCP universe (e.g., weather, news, real-world advice, etc.), politely decline and steer the conversation back on track, for example:

"I am a terminal assistant of the SCP Foundation, specialising in anomalous objects and Foundation lore. That question falls outside my scope. Would you like me to look up a specific SCP entry or explain a containment class instead?"

## Output Format Preferences

- Use Markdown syntax: **bold**, - lists, > quotes
- Use uppercase formatting for entry numbers: SCP-XXXX
- End responses with a friendly tone when appropriate (e.g., "May I help you further?")`

// All AI routes require authentication
ai.use('/*', authMiddleware)

// ─── Helpers ────────────────────────────────────────────────

function getConversationStub(env: Env, conversationId: string): DurableObjectStub {
  const id = env.AI_CHAT_DO.idFromName(conversationId)
  return env.AI_CHAT_DO.get(id)
}

function getQueueStub(env: Env, userId: number): DurableObjectStub {
  const id = env.AI_QUEUE_DO.idFromName(`queue:user:${userId}`)
  return env.AI_QUEUE_DO.get(id)
}

function generateConversationId(): string {
  return crypto.randomUUID()
}

// ─── POST /api/ai/chat ─────────────────────────────────────

ai.post('/chat', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'ai' })
  const payload = c.get('user')
  const body = await c.req.json<AiChatRequest>()

  if (!body.message?.trim()) {
    return c.json({ success: false, error: 'Message is required' }, 400)
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return c.json(
      {
        success: false,
        error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      },
      400,
    )
  }

  let conversationId = body.conversationId
  let isNew = false

  if (!conversationId) {
    conversationId = generateConversationId()
    isNew = true
  }

  const doBody = {
    message: body.message.trim(),
    userId: payload.sub,
    systemPrompt: body.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    title: body.title,
    isNew,
    conversationId,
    stream: body.stream ?? false,
  }

  // Route through the per-user queue for serial processing
  const queueStub = getQueueStub(c.env, payload.sub)

  if (body.stream) {
    // Streaming mode — queue DO proxies the ReadableStream
    const queueResponse = await queueStub.fetch('https://queue.ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doBody),
    })

    // Insert D1 metadata for new conversations
    if (isNew) {
      await c.env.DB.prepare(
        `INSERT INTO ai_conversations (id, user_id, title, system_prompt, message_count, last_message_at)
         VALUES (?, ?, ?, ?, 0, datetime('now'))`,
      )
        .bind(
          conversationId,
          payload.sub,
          body.title ?? 'New Conversation',
          body.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        )
        .run()
      logger.info('AI conversation created (stream)', { conversationId, userId: payload.sub })
    }

    return new Response(queueResponse.body, {
      status: queueResponse.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // Non-streaming mode — queue DO waits for full response
  const queueResponse = await queueStub.fetch('https://queue.ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doBody),
  })

  const data = (await queueResponse.json()) as {
    success: boolean
    conversationId: string
    message: unknown
    title: string
    error?: string
  }

  if (!data.success) {
    return c.json({ success: false, error: data.error ?? 'Chat failed' }, 502)
  }

  // Insert D1 metadata for new conversations
  if (isNew) {
    await c.env.DB.prepare(
      `INSERT INTO ai_conversations (id, user_id, title, system_prompt, message_count, last_message_at)
       VALUES (?, ?, ?, ?, 1, datetime('now'))`,
    )
      .bind(conversationId, payload.sub, data.title, body.systemPrompt ?? DEFAULT_SYSTEM_PROMPT)
      .run()
    logger.info('AI conversation created', { conversationId, userId: payload.sub })
  } else {
    // Update message count and last message time in D1
    await c.env.DB.prepare(
      `UPDATE ai_conversations
       SET message_count = message_count + 1, last_message_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(conversationId)
      .run()
  }

  return c.json({
    success: true,
    conversationId: data.conversationId,
    message: data.message,
    title: data.title,
  })
})

// ─── GET /api/ai/conversations ──────────────────────────────

ai.get('/conversations', async (c) => {
  const payload = c.get('user')
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10) || 20))
  const offset = (page - 1) * limit

  const countRow = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM ai_conversations WHERE user_id = ?',
  )
    .bind(payload.sub)
    .first<{ total: number }>()
  const total = countRow?.total ?? 0

  const rows = await c.env.DB.prepare(
    'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY last_message_at DESC LIMIT ? OFFSET ?',
  )
    .bind(payload.sub, limit, offset)
    .all<AiConversationMeta>()

  return c.json({
    success: true,
    conversations: rows.results,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

// ─── GET /api/ai/conversations/:id ──────────────────────────

ai.get('/conversations/:id', async (c) => {
  const payload = c.get('user')
  const conversationId = c.req.param('id')

  const meta = await c.env.DB.prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?')
    .bind(conversationId, payload.sub)
    .first<AiConversationMeta>()

  if (!meta) {
    return c.json({ success: false, error: 'Conversation not found' }, 404)
  }

  // Get messages from DO
  const stub = getConversationStub(c.env, conversationId)
  const doResponse = await stub.fetch('https://do.ai/messages')
  const data = (await doResponse.json()) as { success: boolean; messages: unknown[] }

  return c.json({
    success: true,
    conversation: { ...meta, messages: data.messages },
  })
})

// ─── PUT /api/ai/conversations/:id ──────────────────────────

ai.put('/conversations/:id', async (c) => {
  const payload = c.get('user')
  const conversationId = c.req.param('id')
  const body = await c.req.json<{ title?: string; systemPrompt?: string }>()

  const meta = await c.env.DB.prepare(
    'SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?',
  )
    .bind(conversationId, payload.sub)
    .first()

  if (!meta) {
    return c.json({ success: false, error: 'Conversation not found' }, 404)
  }

  // Update in DO
  const stub = getConversationStub(c.env, conversationId)
  await stub.fetch('https://do.ai/meta', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Sync to D1
  const updates: string[] = []
  const params: unknown[] = []
  if (body.title !== undefined) {
    updates.push('title = ?')
    params.push(body.title)
  }
  if (body.systemPrompt !== undefined) {
    updates.push('system_prompt = ?')
    params.push(body.systemPrompt)
  }
  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')")
    params.push(conversationId)
    await c.env.DB.prepare(`UPDATE ai_conversations SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run()
  }

  return c.json({ success: true })
})

// ─── DELETE /api/ai/conversations/:id ───────────────────────

ai.delete('/conversations/:id', async (c) => {
  const payload = c.get('user')
  const conversationId = c.req.param('id')

  const result = await c.env.DB.prepare('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?')
    .bind(conversationId, payload.sub)
    .run()

  if (result.meta.changes === 0) {
    return c.json({ success: false, error: 'Conversation not found' }, 404)
  }

  return c.json({ success: true })
})

// ─── POST /api/ai/conversations/:id/regenerate ──────────────

ai.post('/conversations/:id/regenerate', async (c) => {
  const payload = c.get('user')
  const conversationId = c.req.param('id')

  const meta = await c.env.DB.prepare(
    'SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?',
  )
    .bind(conversationId, payload.sub)
    .first()

  if (!meta) {
    return c.json({ success: false, error: 'Conversation not found' }, 404)
  }

  const stub = getConversationStub(c.env, conversationId)
  const doResponse = await stub.fetch('https://do.ai/regenerate', {
    method: 'POST',
  })
  const data = (await doResponse.json()) as { success: boolean; message?: unknown; error?: string }

  if (!data.success) {
    return c.json({ success: false, error: data.error ?? 'Regenerate failed' }, 502)
  }

  // Refresh updated_at in D1
  await c.env.DB.prepare("UPDATE ai_conversations SET updated_at = datetime('now') WHERE id = ?")
    .bind(conversationId)
    .run()

  return c.json(data)
})

export default ai
