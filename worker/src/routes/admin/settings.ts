import { Hono } from 'hono'
import type { Env } from '../../types'

const settings = new Hono<{ Bindings: Env }>()

// GET /api/admin/settings
// Returns read-only system information (no secrets exposed)
settings.get('/', async (c) => {
  const db = c.env.DB

  const [userCount, entryCount, proposalCount, logCount, crawlStates] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM scp_entries').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM proposals').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM system_logs').first<{ count: number }>(),
    db.prepare('SELECT * FROM crawl_state').all(),
  ])

  // Table row counts
  const tableCounts = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM scp_entries').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM crawl_state').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM browsing_history').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM bookmarks').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM proposals').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM proposal_votes').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM system_logs').first<{ count: number }>(),
  ])

  return c.json({
    success: true,
    settings: {
      database: {
        tables: {
          users: tableCounts[0]?.count ?? 0,
          scp_entries: tableCounts[1]?.count ?? 0,
          crawl_state: tableCounts[2]?.count ?? 0,
          browsing_history: tableCounts[3]?.count ?? 0,
          bookmarks: tableCounts[4]?.count ?? 0,
          proposals: tableCounts[5]?.count ?? 0,
          proposal_votes: tableCounts[6]?.count ?? 0,
          system_logs: tableCounts[7]?.count ?? 0,
        },
      },
      cors: (c.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      logLevel: c.env.LOG_LEVEL || 'info',
      crawlStates: crawlStates.results ?? [],
      totals: {
        users: userCount?.count ?? 0,
        entries: entryCount?.count ?? 0,
        proposals: proposalCount?.count ?? 0,
        logs: logCount?.count ?? 0,
      },
    },
  })
})

export default settings
