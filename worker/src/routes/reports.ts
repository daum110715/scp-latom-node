import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getLoggerFromContext } from '../utils/logger'
import type { Env, JwtPayload, EntryReport, ReportPublic } from '../types'

const reports = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>()

const VALID_REPORT_TYPES = ['content_error', 'display_issue', 'special_handling', 'other'] as const
const MAX_REPORTS_PER_ENTRY = 3

// All report routes require authentication
reports.use('/*', authMiddleware)

// ─── POST /api/reports ────────────────────────────────────
// Submit a report for an SCP entry

reports.post('/', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'system' })
  const user = c.get('user')
  const body = await c.req.json<{
    scpNumber?: number
    language?: string
    reportType?: string
    description?: string
  }>()

  const scpNumber = body.scpNumber
  const language = body.language
  const reportType = body.reportType?.trim()
  const description = body.description?.trim()

  // Validation
  if (!scpNumber || isNaN(scpNumber) || scpNumber < 1) {
    return c.json({ success: false, error: 'Invalid SCP number' }, 400)
  }
  if (language !== 'en' && language !== 'cn') {
    return c.json({ success: false, error: 'Invalid language. Use "en" or "cn"' }, 400)
  }
  if (!reportType || !VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number])) {
    return c.json({ success: false, error: `Invalid report type. Use: ${VALID_REPORT_TYPES.join(', ')}` }, 400)
  }
  if (!description || description.length < 10 || description.length > 2000) {
    return c.json({ success: false, error: 'Description must be 10-2000 characters' }, 400)
  }

  // Check if the entry exists
  const entry = await c.env.DB.prepare(
    'SELECT id FROM scp_entries WHERE scp_number = ? AND language = ?'
  ).bind(scpNumber, language).first<{ id: number }>()

  if (!entry) {
    return c.json({ success: false, error: 'SCP entry not found' }, 404)
  }

  // Check per-entry report limit for this user
  const existingCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM entry_reports WHERE user_id = ? AND scp_number = ? AND language = ?'
  ).bind(user.sub, scpNumber, language).first<{ count: number }>()

  if ((existingCount?.count ?? 0) >= MAX_REPORTS_PER_ENTRY) {
    return c.json({
      success: false,
      error: `You have reached the maximum number of reports (${MAX_REPORTS_PER_ENTRY}) for this entry`,
    }, 429)
  }

  // Check for duplicate report type
  const duplicate = await c.env.DB.prepare(
    'SELECT id FROM entry_reports WHERE user_id = ? AND scp_number = ? AND language = ? AND report_type = ?'
  ).bind(user.sub, scpNumber, language, reportType).first<{ id: number }>()

  if (duplicate) {
    return c.json({ success: false, error: 'You have already submitted this type of report for this entry' }, 409)
  }

  // Insert report
  const result = await c.env.DB.prepare(
    `INSERT INTO entry_reports (user_id, scp_number, language, report_type, description)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(user.sub, scpNumber, language, reportType, description).first<EntryReport>()

  if (!result) {
    logger.error('Report creation failed: DB insert returned no result', { userId: user.sub })
    return c.json({ success: false, error: 'Failed to submit report' }, 500)
  }

  logger.info('Report submitted', {
    reportId: result.id,
    userId: user.sub,
    scpNumber,
    language,
    reportType,
  })

  return c.json({
    success: true,
    message: 'Report submitted successfully',
    report: {
      id: result.id,
      scpNumber: result.scp_number,
      language: result.language,
      reportType: result.report_type,
      description: result.description,
      status: result.status,
      createdAt: result.created_at,
    },
  }, 201)
})

// ─── GET /api/reports ─────────────────────────────────────
// List current user's reports

reports.get('/', async (c) => {
  const user = c.get('user')
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10) || 20))
  const offset = (page - 1) * limit

  const countRow = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM entry_reports WHERE user_id = ?'
  ).bind(user.sub).first<{ total: number }>()
  const total = countRow?.total ?? 0

  const rows = await c.env.DB.prepare(
    `SELECT r.*, e.name, e.object_class
     FROM entry_reports r
     LEFT JOIN scp_entries e ON r.scp_number = e.scp_number AND r.language = e.language
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(user.sub, limit, offset).all<EntryReport & { name: string | null; object_class: string | null }>()

  const result: (ReportPublic & { name: string | null; objectClass: string | null })[] = rows.results.map((r) => ({
    id: r.id,
    scpNumber: r.scp_number,
    language: r.language,
    reportType: r.report_type,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    name: r.name,
    objectClass: r.object_class,
  }))

  return c.json({
    success: true,
    reports: result,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

// ─── GET /api/reports/:id ─────────────────────────────────
// Get a single report by ID (own report only)

reports.get('/:id', async (c) => {
  const user = c.get('user')
  const id = parseInt(c.req.param('id') ?? '', 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid report ID' }, 400)

  const row = await c.env.DB.prepare(
    `SELECT r.*, e.name, e.object_class
     FROM entry_reports r
     LEFT JOIN scp_entries e ON r.scp_number = e.scp_number AND r.language = e.language
     WHERE r.id = ? AND r.user_id = ?`
  ).bind(id, user.sub).first<EntryReport & { name: string | null; object_class: string | null }>()

  if (!row) return c.json({ success: false, error: 'Report not found' }, 404)

  return c.json({
    success: true,
    report: {
      id: row.id,
      scpNumber: row.scp_number,
      language: row.language,
      reportType: row.report_type,
      description: row.description,
      status: row.status,
      adminNote: row.admin_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      name: row.name,
      objectClass: row.object_class,
    },
  })
})

// ─── GET /api/reports/check/:lang/:scpNumber ──────────────
// Check if user has already reported this entry

reports.get('/check/:lang/:scpNumber', async (c) => {
  const user = c.get('user')
  const lang = c.req.param('lang')
  const scpNumber = parseInt(c.req.param('scpNumber') ?? '', 10)

  if (lang !== 'en' && lang !== 'cn') {
    return c.json({ success: false, error: 'Invalid language' }, 400)
  }
  if (isNaN(scpNumber) || scpNumber < 1) {
    return c.json({ success: false, error: 'Invalid SCP number' }, 400)
  }

  const rows = await c.env.DB.prepare(
    'SELECT id, report_type, status FROM entry_reports WHERE user_id = ? AND scp_number = ? AND language = ?'
  ).bind(user.sub, scpNumber, lang).all<{ id: number; report_type: string; status: string }>()

  return c.json({
    success: true,
    hasReports: rows.results.length > 0,
    reports: rows.results.map((r) => ({
      id: r.id,
      reportType: r.report_type,
      status: r.status,
    })),
    count: rows.results.length,
    maxReports: MAX_REPORTS_PER_ENTRY,
  })
})

export default reports
