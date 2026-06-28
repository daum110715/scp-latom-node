import { Hono } from 'hono'
import type { Env, Proposal } from '../../types'

const proposals = new Hono<{ Bindings: Env }>()

const VALID_STATUSES = ['open', 'approved', 'rejected'] as const
const VALID_CATEGORIES = ['protocol', 'research', 'containment', 'general'] as const

// GET /api/admin/proposals
// List all proposals (any status) with pagination
proposals.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10) || 20))
  const offset = (page - 1) * limit
  const statusFilter = c.req.query('status')?.trim()
  const categoryFilter = c.req.query('category')?.trim()
  const userId = c.req.query('userId')?.trim()

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (statusFilter && VALID_STATUSES.includes(statusFilter as (typeof VALID_STATUSES)[number])) {
    where += ' AND p.status = ?'
    params.push(statusFilter)
  }
  if (
    categoryFilter &&
    VALID_CATEGORIES.includes(categoryFilter as (typeof VALID_CATEGORIES)[number])
  ) {
    where += ' AND p.category = ?'
    params.push(categoryFilter)
  }
  if (userId) {
    const uid = parseInt(userId, 10)
    if (!isNaN(uid)) {
      where += ' AND p.user_id = ?'
      params.push(uid)
    }
  }

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM proposals p ${where}`)
    .bind(...params)
    .first<{ total: number }>()
  const total = countRow?.total ?? 0

  const rows = await c.env.DB.prepare(
    `SELECT p.*, u.codename as author_codename
     FROM proposals p
     JOIN users u ON p.user_id = u.id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all<Proposal & { author_codename: string }>()

  // Fetch vote counts for this page in batch (avoids N+1)
  const proposalIds = rows.results.map((r) => r.id)
  const resultProposals = []

  if (proposalIds.length > 0) {
    const placeholders = proposalIds.map(() => '?').join(',')
    const allVoteCounts = await c.env.DB.prepare(
      `SELECT proposal_id,
        SUM(CASE WHEN vote = 'for' THEN 1 ELSE 0 END) as vfor,
        SUM(CASE WHEN vote = 'against' THEN 1 ELSE 0 END) as against,
        SUM(CASE WHEN vote = 'abstain' THEN 1 ELSE 0 END) as abstain
       FROM proposal_votes WHERE proposal_id IN (${placeholders})
       GROUP BY proposal_id`,
    )
      .bind(...proposalIds)
      .all<{ proposal_id: number; vfor: number; against: number; abstain: number }>()

    const voteCountMap = new Map<number, { vfor: number; against: number; abstain: number }>()
    for (const row of allVoteCounts.results) {
      voteCountMap.set(row.proposal_id, {
        vfor: row.vfor,
        against: row.against,
        abstain: row.abstain,
      })
    }

    for (const proposal of rows.results) {
      const vc = voteCountMap.get(proposal.id) ?? { vfor: 0, against: 0, abstain: 0 }
      resultProposals.push({
        id: proposal.id,
        title: proposal.title,
        content: proposal.content,
        category: proposal.category,
        status: proposal.status,
        authorCodename: proposal.author_codename,
        votesFor: vc.vfor,
        votesAgainst: vc.against,
        votesAbstain: vc.abstain,
        createdAt: proposal.created_at,
        updatedAt: proposal.updated_at,
      })
    }
  }

  return c.json({
    success: true,
    proposals: resultProposals,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

// GET /api/admin/proposals/:id
// Get proposal with full voter list
proposals.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid proposal ID' }, 400)

  const proposal = await c.env.DB.prepare(
    `SELECT p.*, u.codename as author_codename
     FROM proposals p JOIN users u ON p.user_id = u.id
     WHERE p.id = ?`,
  )
    .bind(id)
    .first<Proposal & { author_codename: string }>()

  if (!proposal) return c.json({ success: false, error: 'Proposal not found' }, 404)

  const [voteCounts, voters] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
        SUM(CASE WHEN vote = 'for' THEN 1 ELSE 0 END) as vfor,
        SUM(CASE WHEN vote = 'against' THEN 1 ELSE 0 END) as against,
        SUM(CASE WHEN vote = 'abstain' THEN 1 ELSE 0 END) as abstain
       FROM proposal_votes WHERE proposal_id = ?`,
    )
      .bind(id)
      .first<{ vfor: number; against: number; abstain: number }>(),
    c.env.DB.prepare(
      `SELECT pv.vote, pv.created_at, u.codename
       FROM proposal_votes pv JOIN users u ON pv.user_id = u.id
       WHERE pv.proposal_id = ? ORDER BY pv.created_at ASC`,
    )
      .bind(id)
      .all<{ vote: string; created_at: string; codename: string }>(),
  ])

  return c.json({
    success: true,
    proposal: {
      id: proposal.id,
      title: proposal.title,
      content: proposal.content,
      category: proposal.category,
      status: proposal.status,
      authorCodename: proposal.author_codename,
      votesFor: voteCounts?.vfor ?? 0,
      votesAgainst: voteCounts?.against ?? 0,
      votesAbstain: voteCounts?.abstain ?? 0,
      voters: voters.results ?? [],
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
    },
  })
})

// PUT /api/admin/proposals/:id/status
// Change proposal status
proposals.put('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid proposal ID' }, 400)

  const body = await c.req.json<{ status?: string }>()
  const status = body.status?.trim()

  if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return c.json(
      { success: false, error: `Invalid status. Use: ${VALID_STATUSES.join(', ')}` },
      400,
    )
  }

  const proposal = await c.env.DB.prepare('SELECT id FROM proposals WHERE id = ?').bind(id).first()
  if (!proposal) return c.json({ success: false, error: 'Proposal not found' }, 404)

  await c.env.DB.prepare(
    "UPDATE proposals SET status = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(status, id)
    .run()

  return c.json({ success: true, message: `Proposal status updated to '${status}'` })
})

// DELETE /api/admin/proposals/:id
// Delete proposal and cascade votes
proposals.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid proposal ID' }, 400)

  const proposal = await c.env.DB.prepare('SELECT id FROM proposals WHERE id = ?').bind(id).first()
  if (!proposal) return c.json({ success: false, error: 'Proposal not found' }, 404)

  await c.env.DB.prepare('DELETE FROM proposal_votes WHERE proposal_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM proposals WHERE id = ?').bind(id).run()

  return c.json({ success: true, message: 'Proposal deleted' })
})

export default proposals
