import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestLogger } from './middleware/logger'
import { Logger } from './utils/logger'
import { getDynamicOrigins } from './utils/cors-origins'
import authRoutes from './routes/auth'
import crawlerRoutes from './routes/crawler'
import historyRoutes from './routes/history'
import proposalRoutes from './routes/proposals'
import bookmarkRoutes from './routes/bookmarks'
import reportRoutes from './routes/reports'
import logRoutes from './routes/logs'
import adminRoutes from './routes/admin'
import aiRoutes from './routes/ai'
import tagRoutes from './routes/tags'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env; Variables: { logger: Logger } }>()

function isOriginAllowed(origin: string, allowed: string): boolean {
  // Exact match
  if (origin === allowed) return true
  // Wildcard subdomain match: https://*.example.com matches https://foo.example.com
  if (allowed.includes('*')) {
    const pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '[a-zA-Z0-9-]+')
    return new RegExp(`^${pattern}$`).test(origin)
  }
  return false
}

// CORS
app.use(
  '/api/*',
  cors({
    origin: async (origin, c) => {
      if (!origin) return ''
      const staticList = (c.env.CORS_ORIGINS || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
      let dynamicList: string[] = []
      try {
        dynamicList = await getDynamicOrigins(c.env.DB)
      } catch (err) {
        // D1 unavailable — fall back to the static list rather than failing the request
        console.warn(
          '[CORS] Failed to fetch dynamic origins from D1:',
          err instanceof Error ? err.message : err,
        )
      }
      const allowed = [...staticList, ...dynamicList].some((pattern: string) =>
        isOriginAllowed(origin, pattern),
      )
      return allowed ? origin : ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }),
)

// Security headers
app.use('/api/*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
})

// Request logging (attaches logger to context)
app.use('/api/*', async (c, next) => {
  const middleware = requestLogger(c.env)
  return middleware(c, next)
})

// Health check
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    status: 'ok',
    service: 'scp-latom-node-api',
    timestamp: new Date().toISOString(),
  })
})

// Auth routes
app.route('/api/auth', authRoutes)

// Crawler routes
app.route('/api/crawler', crawlerRoutes)

// History routes
app.route('/api/history', historyRoutes)

// Proposal routes
app.route('/api/proposals', proposalRoutes)

// Bookmark routes
app.route('/api/bookmarks', bookmarkRoutes)

// Report routes
app.route('/api/reports', reportRoutes)

// Client log ingestion
app.route('/api/logs', logRoutes)

// Admin routes (all protected by admin middleware)
app.route('/api/admin', adminRoutes)

// AI chat routes
app.route('/api/ai', aiRoutes)

// Tag routes
app.route('/api/tags', tagRoutes)

// 404 fallback
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404)
})

// Global error handler
app.onError((err, c) => {
  const logger = c.get('logger')
  if (logger) {
    logger.error('Unhandled error', { error: err })
  } else {
    // Fallback when middleware didn't run (shouldn't happen on /api/* paths)
    console.error('Unhandled error:', err)
  }
  return c.json({ success: false, error: 'Internal server error' }, 500)
})

export default app

// Re-export Durable Object classes for wrangler
export { ScpCrawlerDo } from './do/scp-crawler'
export { AiChatDo } from './do/ai-chat'
export { AiQueueDo } from './do/ai-queue'
