import { Hono } from 'hono'
import { getLoggerFromContext } from '../../utils/logger'
import type { Env, AdminEntry } from '../../types'

const entries = new Hono<{ Bindings: Env }>()

const VALID_CLASSES = [
  'Safe',
  'Euclid',
  'Keter',
  'Thaumiel',
  'Apollyon',
  'Neutralized',
  'Unknown',
] as const

// GET /api/admin/entries
// List entries with search/filter/pagination
entries.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') ?? '50', 10) || 50))
  const offset = (page - 1) * limit
  const q = c.req.query('q')?.trim()
  const language = c.req.query('language')?.trim()
  const objectClass = c.req.query('object_class')?.trim()
  const series = c.req.query('series')?.trim()
  const hasContent = c.req.query('hasContent')?.trim()

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (q) {
    const num = parseInt(q, 10)
    if (!isNaN(num)) {
      where += ' AND (scp_number = ? OR name LIKE ?)'
      params.push(num, `%${q}%`)
    } else {
      where += ' AND name LIKE ?'
      params.push(`%${q}%`)
    }
  }
  if (language && (language === 'en' || language === 'cn')) {
    where += ' AND language = ?'
    params.push(language)
  }
  if (objectClass && VALID_CLASSES.includes(objectClass as (typeof VALID_CLASSES)[number])) {
    where += ' AND object_class = ?'
    params.push(objectClass)
  }
  if (series) {
    const seriesNum = parseInt(series, 10)
    if (!isNaN(seriesNum)) {
      where += ' AND series = ?'
      params.push(seriesNum)
    }
  }
  if (hasContent === 'true') {
    where += ' AND content IS NOT NULL'
  } else if (hasContent === 'false') {
    where += ' AND content IS NULL'
  }

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM scp_entries ${where}`)
    .bind(...params)
    .first<{ total: number }>()
  const total = countRow?.total ?? 0

  const rows = await c.env.DB.prepare(
    `SELECT id, scp_number, language, name, object_class, url, series,
            CASE WHEN content IS NOT NULL THEN 1 ELSE 0 END as has_content,
            content_fetched_at, content_error, created_at, updated_at
     FROM scp_entries ${where}
     ORDER BY scp_number ASC, language ASC
     LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all()

  return c.json({
    success: true,
    entries: rows.results ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

// GET /api/admin/entries/:id
// Get single entry with full content
entries.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid entry ID' }, 400)

  const entry = await c.env.DB.prepare('SELECT * FROM scp_entries WHERE id = ?')
    .bind(id)
    .first<AdminEntry>()

  if (!entry) return c.json({ success: false, error: 'Entry not found' }, 404)

  return c.json({ success: true, entry })
})

// PUT /api/admin/entries/:id
// Update entry (name, object_class)
entries.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid entry ID' }, 400)

  const body = await c.req.json<{ name?: string; object_class?: string }>()
  const name = body.name?.trim()
  const objectClass = body.object_class?.trim()

  const entry = await c.env.DB.prepare('SELECT id FROM scp_entries WHERE id = ?').bind(id).first()
  if (!entry) return c.json({ success: false, error: 'Entry not found' }, 404)

  if (objectClass && !VALID_CLASSES.includes(objectClass as (typeof VALID_CLASSES)[number])) {
    return c.json(
      { success: false, error: `Invalid object class. Use: ${VALID_CLASSES.join(', ')}` },
      400,
    )
  }

  const sets: string[] = []
  const params: unknown[] = []

  if (name !== undefined) {
    sets.push('name = ?')
    params.push(name)
  }
  if (objectClass !== undefined) {
    sets.push('object_class = ?')
    params.push(objectClass)
  }

  if (sets.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400)

  sets.push("updated_at = datetime('now')")
  params.push(id)

  await c.env.DB.prepare(`UPDATE scp_entries SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM scp_entries WHERE id = ?').bind(id).first()
  return c.json({ success: true, entry: updated })
})

// DELETE /api/admin/entries/:id
// Delete entry
entries.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid entry ID' }, 400)

  const entry = await c.env.DB.prepare('SELECT id FROM scp_entries WHERE id = ?').bind(id).first()
  if (!entry) return c.json({ success: false, error: 'Entry not found' }, 404)

  await c.env.DB.prepare('DELETE FROM scp_entries WHERE id = ?').bind(id).run()

  return c.json({ success: true, message: 'Entry deleted' })
})

// POST /api/admin/entries/:id/refetch
// Clear content and trigger re-fetch via Durable Object
entries.post('/:id/refetch', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid entry ID' }, 400)

  const entry = await c.env.DB.prepare(
    'SELECT id, scp_number, language FROM scp_entries WHERE id = ?',
  )
    .bind(id)
    .first<{ id: number; scp_number: number; language: string }>()

  if (!entry) return c.json({ success: false, error: 'Entry not found' }, 404)

  // Clear cached content
  await c.env.DB.prepare(
    "UPDATE scp_entries SET content = NULL, content_fetched_at = NULL, content_error = NULL, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(id)
    .run()

  // Trigger re-fetch via Durable Object
  const ns = entry.language === 'en' ? c.env.SCP_EN_CRAWLER : c.env.SCP_CN_CRAWLER
  const doId = ns.idFromName(`scp-${entry.language}-crawler`)
  const stub = ns.get(doId)

  try {
    await stub.fetch(`https://do.scp/${entry.language}/entry/${entry.scp_number}`)
    logger.info('Entry content refetch triggered', {
      entryId: id,
      scpNumber: entry.scp_number,
      language: entry.language,
    })
  } catch (err) {
    logger.error('Failed to trigger refetch', {
      entryId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    return c.json({ success: false, error: 'Content cleared but re-fetch failed' }, 502)
  }

  return c.json({ success: true, message: 'Content cleared and re-fetch triggered' })
})

// POST /api/admin/crawl/:lang
// Trigger crawl for a specific language
entries.post('/crawl/:lang', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const lang = c.req.param('lang')
  if (lang !== 'en' && lang !== 'cn') {
    return c.json({ success: false, error: "Invalid language. Use 'en' or 'cn'" }, 400)
  }

  const ns = lang === 'en' ? c.env.SCP_EN_CRAWLER : c.env.SCP_CN_CRAWLER
  const doId = ns.idFromName(`scp-${lang}-crawler`)
  const stub = ns.get(doId)

  try {
    const url = new URL(c.req.url)
    const searchParams = url.searchParams.toString()
    const path = `/crawl${searchParams ? `?${searchParams}` : ''}`

    logger.info(`Admin triggering crawl for language: ${lang}`)
    const response = await stub.fetch(`https://do.scp/${lang}${path}`, { method: 'POST' })
    const data = await response.json()
    return c.json(data, response.status as 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`Failed to trigger crawl for ${lang}`, { error: message })
    return c.json({ success: false, error: `Failed to trigger crawl: ${message}` }, 503)
  }
})

// GET /api/admin/crawl/status
// Get crawl status for both languages
entries.get('/crawl/status', async (c) => {
  try {
    const [enStub, cnStub] = [
      c.env.SCP_EN_CRAWLER.get(c.env.SCP_EN_CRAWLER.idFromName('scp-en-crawler')),
      c.env.SCP_CN_CRAWLER.get(c.env.SCP_CN_CRAWLER.idFromName('scp-cn-crawler')),
    ]

    const [enRes, cnRes] = await Promise.all([
      enStub.fetch('https://do.scp/en/status'),
      cnStub.fetch('https://do.scp/cn/status'),
    ])

    const enData = await enRes.json()
    const cnData = await cnRes.json()

    return c.json({ success: true, en: enData, cn: cnData })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ success: false, error: `Failed to fetch crawl status: ${message}` }, 503)
  }
})

export default entries
