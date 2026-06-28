import { Hono } from 'hono'
import { Logger } from '../utils/logger'
import type { Env } from '../types'

const logs = new Hono<{ Bindings: Env }>()

const MAX_BATCH_SIZE = 50
const VALID_LEVELS = ['debug', 'info', 'warn', 'error'] as const

interface ClientLogEntry {
  level: string
  message: string
  context?: Record<string, unknown>
  timestamp?: string
  path?: string
}

/**
 * POST /api/logs
 *
 * Accepts batched client-side log entries. Only warn and error
 * level entries are persisted to D1. debug/info are accepted
 * but silently discarded (they stay in the browser console only).
 *
 * Rate limiting: max 50 entries per request.
 */
logs.post('/', async (c) => {
  const logger = new Logger({ level: 'info', db: c.env.DB, source: 'server' })

  let body: { logs?: ClientLogEntry[] }
  try {
    body = await c.req.json<{ logs?: ClientLogEntry[] }>()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  if (!Array.isArray(body.logs) || body.logs.length === 0) {
    return c.json({ success: false, error: 'Missing or empty logs array' }, 400)
  }

  if (body.logs.length > MAX_BATCH_SIZE) {
    return c.json({ success: false, error: `Too many entries. Max: ${MAX_BATCH_SIZE}` }, 400)
  }

  // Extract user info from optional JWT (don't require auth)
  let userId: number | undefined
  const header = c.req.header('Authorization')
  if (header?.startsWith('Bearer ')) {
    try {
      const { verifyToken } = await import('../utils/jwt')
      const payload = await verifyToken(header.slice(7), c.env.JWT_SECRET)
      if (payload) userId = payload.sub
    } catch {
      // ignore — anonymous client log
    }
  }

  const userAgent = c.req.header('user-agent') ?? undefined
  const ip =
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined

  let persisted = 0

  for (const entry of body.logs) {
    const level = entry.level as (typeof VALID_LEVELS)[number]
    if (!VALID_LEVELS.includes(level)) continue
    if (typeof entry.message !== 'string' || entry.message.length === 0) continue
    if (entry.message.length > 2000) continue // cap message length

    // Only persist warn/error to D1
    if (level === 'warn' || level === 'error') {
      const childLogger = logger.child({
        user_id: userId,
        category: 'client',
        path: entry.path,
        user_agent: userAgent,
        ip,
      })

      // Use the client-side timestamp in the message context
      childLogger[level](entry.message, {
        ...entry.context,
        clientTimestamp: entry.timestamp,
      })
      persisted++
    }
  }

  return c.json({ success: true, received: body.logs.length, persisted })
})

export default logs
