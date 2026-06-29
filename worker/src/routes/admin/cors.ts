import { Hono } from 'hono'
import type { Env, CorsOriginRecord } from '../../types'
import { invalidateDynamicOriginsCache } from '../../utils/cors-origins'

const corsOrigins = new Hono<{ Bindings: Env }>()

// http(s)://host[:port], optional single leading wildcard label
const ORIGIN_PATTERN = /^https?:\/\/(\*\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(:\d+)?$/

// GET /api/admin/cors
// Returns both the static (wrangler.toml) and dynamic (D1, admin-managed) origin lists.
corsOrigins.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, origin, created_at FROM cors_origins ORDER BY created_at DESC',
  ).all<CorsOriginRecord>()

  const staticOrigins = (c.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return c.json({ success: true, static: staticOrigins, dynamic: rows.results ?? [] })
})

// POST /api/admin/cors  { origin: "https://example.com" }
corsOrigins.post('/', async (c) => {
  const body = await c.req.json<{ origin?: string }>()
  const origin = body.origin?.trim().replace(/\/+$/, '')

  if (!origin || origin.length > 256 || !ORIGIN_PATTERN.test(origin)) {
    return c.json(
      {
        success: false,
        error: 'Invalid origin. Expected e.g. https://example.com or https://*.example.com',
      },
      400,
    )
  }

  const existing = await c.env.DB.prepare('SELECT id FROM cors_origins WHERE origin = ?')
    .bind(origin)
    .first()
  if (existing) {
    return c.json({ success: false, error: 'Origin already exists' }, 400)
  }

  const row = await c.env.DB.prepare('INSERT INTO cors_origins (origin) VALUES (?) RETURNING *')
    .bind(origin)
    .first<CorsOriginRecord>()

  invalidateDynamicOriginsCache()
  return c.json({ success: true, origin: row })
})

// DELETE /api/admin/cors/:id
corsOrigins.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid id' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM cors_origins WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) return c.json({ success: false, error: 'Origin not found' }, 404)

  await c.env.DB.prepare('DELETE FROM cors_origins WHERE id = ?').bind(id).run()

  invalidateDynamicOriginsCache()
  return c.json({ success: true, message: 'Origin removed' })
})

export default corsOrigins
