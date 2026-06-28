import { Hono } from 'hono'
import type { Env, AdminLogEntry } from '../../types'

const logs = new Hono<{ Bindings: Env }>()

const VALID_LEVELS = ['debug', 'info', 'warn', 'error'] as const
const VALID_SOURCES = ['server', 'client'] as const

// GET /api/admin/logs
// Browse/search/filter logs
logs.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') ?? '50', 10) || 50))
  const offset = (page - 1) * limit
  const level = c.req.query('level')?.trim()
  const source = c.req.query('source')?.trim()
  const category = c.req.query('category')?.trim()
  const userId = c.req.query('userId')?.trim()
  const q = c.req.query('q')?.trim()
  const from = c.req.query('from')?.trim()
  const to = c.req.query('to')?.trim()
  const sort = c.req.query('sort')?.trim() === 'level' ? 'level' : 'timestamp'
  const order = c.req.query('order')?.trim() === 'asc' ? 'ASC' : 'DESC'

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (level && VALID_LEVELS.includes(level as typeof VALID_LEVELS[number])) {
    where += ' AND level = ?'
    params.push(level)
  }
  if (source && VALID_SOURCES.includes(source as typeof VALID_SOURCES[number])) {
    where += ' AND source = ?'
    params.push(source)
  }
  if (category) {
    where += ' AND category = ?'
    params.push(category)
  }
  if (userId) {
    const uid = parseInt(userId, 10)
    if (!isNaN(uid)) {
      where += ' AND user_id = ?'
      params.push(uid)
    }
  }
  if (q) {
    where += ' AND message LIKE ?'
    params.push(`%${q}%`)
  }
  if (from) {
    where += ' AND timestamp >= ?'
    params.push(from)
  }
  if (to) {
    where += ' AND timestamp <= ?'
    params.push(to)
  }

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM system_logs ${where}`
  ).bind(...params).first<{ total: number }>()
  const total = countRow?.total ?? 0

  const rows = await c.env.DB.prepare(
    `SELECT * FROM system_logs ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all<AdminLogEntry>()

  return c.json({
    success: true,
    logs: rows.results ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

// GET /api/admin/logs/stats
// Log statistics: count by level, source, category
logs.get('/stats', async (c) => {
  const [byLevel, bySource, byCategory, errorRate] = await Promise.all([
    c.env.DB.prepare(
      'SELECT level, COUNT(*) as count FROM system_logs GROUP BY level'
    ).all<{ level: string; count: number }>(),
    c.env.DB.prepare(
      'SELECT source, COUNT(*) as count FROM system_logs GROUP BY source'
    ).all<{ source: string; count: number }>(),
    c.env.DB.prepare(
      'SELECT category, COUNT(*) as count FROM system_logs WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 20'
    ).all<{ category: string; count: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as errors FROM system_logs WHERE timestamp >= datetime('now', '-24 hours')"
    ).first<{ total: number; errors: number }>(),
  ])

  return c.json({
    success: true,
    stats: {
      byLevel: byLevel.results ?? [],
      bySource: bySource.results ?? [],
      byCategory: byCategory.results ?? [],
      errorRate: {
        total: errorRate?.total ?? 0,
        errors: errorRate?.errors ?? 0,
        rate: errorRate?.total ? ((errorRate.errors ?? 0) / errorRate.total * 100) : 0,
      },
    },
  })
})

// GET /api/admin/logs/:id
// Get single log entry detail
logs.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid log ID' }, 400)

  const log = await c.env.DB.prepare(
    'SELECT * FROM system_logs WHERE id = ?'
  ).bind(id).first<AdminLogEntry>()

  if (!log) return c.json({ success: false, error: 'Log entry not found' }, 404)

  return c.json({ success: true, log })
})

// DELETE /api/admin/logs/cleanup
// Delete logs older than N days
logs.delete('/cleanup', async (c) => {
  const days = Math.max(1, parseInt(c.req.query('days') ?? '30', 10) || 30)

  // Compute cutoff timestamp in JS to avoid SQL string interpolation
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().replace('T', ' ').slice(0, 19)

  const countBefore = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM system_logs WHERE timestamp < ?'
  ).bind(cutoff).first<{ count: number }>()

  await c.env.DB.prepare(
    'DELETE FROM system_logs WHERE timestamp < ?'
  ).bind(cutoff).run()

  return c.json({
    success: true,
    message: `Deleted logs older than ${days} days`,
    deleted: countBefore?.count ?? 0,
  })
})

export default logs
