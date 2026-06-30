import { Hono } from 'hono'
import type { Env, AdminUserDetail } from '../../types'

const users = new Hono<{ Bindings: Env }>()

const VALID_SORT_FIELDS = ['codename', 'created_at', 'clearance', 'role'] as const
const VALID_ORDERS = ['asc', 'desc'] as const
const VALID_ROLES = ['admin', 'personnel', 'banned'] as const

// GET /api/admin/users
// List users with search/filter/pagination
users.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10) || 20))
  const offset = (page - 1) * limit
  const q = c.req.query('q')?.trim()
  const roleFilter = c.req.query('role')?.trim()
  const sort = VALID_SORT_FIELDS.includes(c.req.query('sort') as (typeof VALID_SORT_FIELDS)[number])
    ? c.req.query('sort')
    : 'created_at'
  const order = VALID_ORDERS.includes(c.req.query('order') as (typeof VALID_ORDERS)[number])
    ? c.req.query('order')
    : 'desc'

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (q) {
    where += ' AND codename LIKE ?'
    params.push(`%${q}%`)
  }
  if (roleFilter) {
    where += ' AND role = ?'
    params.push(roleFilter)
  }

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM users ${where}`)
    .bind(...params)
    .first<{ total: number }>()
  const total = countRow?.total ?? 0

  const rows = await c.env.DB.prepare(
    `SELECT id, codename, role, clearance, created_at, updated_at FROM users ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all<{
      id: number
      codename: string
      role: string
      clearance: number
      created_at: string
      updated_at: string
    }>()

  return c.json({
    success: true,
    users: rows.results ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

// GET /api/admin/users/:id
// Get user detail with activity counts
users.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid user ID' }, 400)

  const user = await c.env.DB.prepare(
    'SELECT id, codename, role, clearance, created_at, updated_at FROM users WHERE id = ?',
  )
    .bind(id)
    .first<{
      id: number
      codename: string
      role: string
      clearance: number
      created_at: string
      updated_at: string
    }>()

  if (!user) return c.json({ success: false, error: 'User not found' }, 404)

  const [historyCount, bookmarkCount, proposalCount, voteCount] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM browsing_history WHERE user_id = ?')
      .bind(id)
      .first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?')
      .bind(id)
      .first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM proposals WHERE user_id = ?')
      .bind(id)
      .first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM proposal_votes WHERE user_id = ?')
      .bind(id)
      .first<{ count: number }>(),
  ])

  return c.json({
    success: true,
    user: {
      ...user,
      historyCount: historyCount?.count ?? 0,
      bookmarkCount: bookmarkCount?.count ?? 0,
      proposalCount: proposalCount?.count ?? 0,
      voteCount: voteCount?.count ?? 0,
    } as AdminUserDetail,
  })
})

// GET /api/admin/users/:id/history
// Get user's browsing history
users.get('/:id/history', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid user ID' }, 400)

  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '50', 10) || 50))
  const offset = (page - 1) * limit

  const rows = await c.env.DB.prepare(
    'SELECT * FROM browsing_history WHERE user_id = ? ORDER BY visited_at DESC LIMIT ? OFFSET ?',
  )
    .bind(id, limit, offset)
    .all()

  return c.json({ success: true, history: rows.results ?? [] })
})

// GET /api/admin/users/:id/bookmarks
// Get user's bookmarks
users.get('/:id/bookmarks', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid user ID' }, 400)

  const rows = await c.env.DB.prepare(
    `SELECT b.*, e.name, e.object_class FROM bookmarks b
     LEFT JOIN scp_entries e ON b.scp_number = e.scp_number AND b.language = e.language
     WHERE b.user_id = ? ORDER BY b.created_at DESC`,
  )
    .bind(id)
    .all()

  return c.json({ success: true, bookmarks: rows.results ?? [] })
})

// PUT /api/admin/users/:id/role
// Change user role
users.put('/:id/role', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid user ID' }, 400)

  const body = await c.req.json<{ role?: string }>()
  const role = body.role?.trim()
  if (!role || !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return c.json(
      { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
      400,
    )
  }

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
  if (!user) return c.json({ success: false, error: 'User not found' }, 404)

  await c.env.DB.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(role, id)
    .run()

  return c.json({ success: true, message: `Role updated to '${role}'` })
})

// PUT /api/admin/users/:id/clearance
// Change user clearance level
users.put('/:id/clearance', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid user ID' }, 400)

  const body = await c.req.json<{ clearance?: number }>()
  const clearance = body.clearance
  if (clearance === undefined || clearance < 0 || clearance > 5 || !Number.isInteger(clearance)) {
    return c.json({ success: false, error: 'Clearance must be an integer between 0 and 5' }, 400)
  }

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
  if (!user) return c.json({ success: false, error: 'User not found' }, 404)

  await c.env.DB.prepare(
    "UPDATE users SET clearance = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(clearance, id)
    .run()

  return c.json({ success: true, message: `Clearance updated to level ${clearance}` })
})

// PUT /api/admin/users/:id/ban
// Ban user (set role to 'banned', clearance to 0)
users.put('/:id/ban', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid user ID' }, 400)

  const user = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: number; role: string }>()
  if (!user) return c.json({ success: false, error: 'User not found' }, 404)
  if (user.role === 'admin')
    return c.json({ success: false, error: 'Cannot ban an admin user' }, 400)

  await c.env.DB.prepare(
    "UPDATE users SET role = 'banned', clearance = 0, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(id)
    .run()

  return c.json({ success: true, message: 'User banned' })
})

// PUT /api/admin/users/:id/unban
// Unban user (restore to 'personnel', clearance 1)
users.put('/:id/unban', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid user ID' }, 400)

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
  if (!user) return c.json({ success: false, error: 'User not found' }, 404)

  await c.env.DB.prepare(
    "UPDATE users SET role = 'personnel', clearance = 1, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(id)
    .run()

  return c.json({ success: true, message: 'User unbanned' })
})

// DELETE /api/admin/users/:id
// Delete user and all associated data
users.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid user ID' }, 400)

  const user = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: number; role: string }>()
  if (!user) return c.json({ success: false, error: 'User not found' }, 404)
  if (user.role === 'admin')
    return c.json({ success: false, error: 'Cannot delete an admin user' }, 400)

  // Cascade delete: history, bookmarks, proposal votes, proposals
  await c.env.DB.prepare('DELETE FROM browsing_history WHERE user_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM bookmarks WHERE user_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM proposal_votes WHERE user_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM proposals WHERE user_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

  return c.json({ success: true, message: 'User deleted' })
})

export default users
