import { Hono } from 'hono'
import type { Env } from '../../types'

const dashboard = new Hono<{ Bindings: Env }>()

// GET /api/admin/stats
// Returns aggregated system statistics
dashboard.get('/', async (c) => {
  const db = c.env.DB

  const [
    totalUsers,
    entriesByLanguage,
    entriesByClass,
    proposalsByStatus,
    newUsersToday,
    newProposalsToday,
    newVotesToday,
    errorsLast24h,
    logErrorRate,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT language, COUNT(*) as count FROM scp_entries GROUP BY language').all<{ language: string; count: number }>(),
    db.prepare('SELECT object_class, COUNT(*) as count FROM scp_entries GROUP BY object_class').all<{ object_class: string; count: number }>(),
    db.prepare('SELECT status, COUNT(*) as count FROM proposals GROUP BY status').all<{ status: string; count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM proposals WHERE created_at >= date('now')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM proposal_votes WHERE created_at >= date('now')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM system_logs WHERE level = 'error' AND timestamp >= datetime('now', '-24 hours')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as errors FROM system_logs WHERE timestamp >= datetime('now', '-7 days')").first<{ total: number; errors: number }>(),
  ])

  return c.json({
    success: true,
    stats: {
      totalUsers: totalUsers?.count ?? 0,
      entriesByLanguage: entriesByLanguage.results ?? [],
      entriesByClass: entriesByClass.results ?? [],
      proposalsByStatus: proposalsByStatus.results ?? [],
      recentActivity: {
        newUsersToday: newUsersToday?.count ?? 0,
        newProposalsToday: newProposalsToday?.count ?? 0,
        newVotesToday: newVotesToday?.count ?? 0,
        errorsLast24h: errorsLast24h?.count ?? 0,
      },
      logErrorRate: {
        total: logErrorRate?.total ?? 0,
        errors: logErrorRate?.errors ?? 0,
        rate: logErrorRate?.total ? ((logErrorRate.errors ?? 0) / logErrorRate.total * 100) : 0,
      },
    },
  })
})

export default dashboard
