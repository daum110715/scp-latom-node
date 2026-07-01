import { Hono } from 'hono'
import { getLoggerFromContext } from '../../utils/logger'
import { autoTagEntry } from '../../utils/auto-tagger'
import type { Env, TagCategory, Tag } from '../../types'

const tags = new Hono<{ Bindings: Env }>()

// ─── GET /api/admin/tags/stats ──────────────────────────────
// Tag usage statistics

tags.get('/stats', async (c) => {
  const categoryCounts = await c.env.DB.prepare(
    `SELECT tc.id, tc.name, tc.name_en, COUNT(t.id) as tag_count
     FROM tag_categories tc
     LEFT JOIN tags t ON tc.id = t.category_id
     GROUP BY tc.id
     ORDER BY tc.sort_order ASC`,
  ).all<{ id: string; name: string; name_en: string; tag_count: number }>()

  const totalTags = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tags').first<{
    count: number
  }>()

  const totalEntryTags = await c.env.DB.prepare('SELECT COUNT(*) as count FROM entry_tags').first<{
    count: number
  }>()

  const topTags = await c.env.DB.prepare(
    `SELECT t.id, t.name, t.name_zh, t.category_id, COUNT(et.id) as usage_count
     FROM tags t
     LEFT JOIN entry_tags et ON t.id = et.tag_id
     GROUP BY t.id
     ORDER BY usage_count DESC
     LIMIT 20`,
  ).all<{ id: string; name: string; name_zh: string; category_id: string; usage_count: number }>()

  return c.json({
    success: true,
    stats: {
      totalCategories: categoryCounts.results.length,
      totalTags: totalTags?.count ?? 0,
      totalEntryTags: totalEntryTags?.count ?? 0,
      byCategory: categoryCounts.results,
      topTags: topTags.results,
    },
  })
})

// ─── Category CRUD ──────────────────────────────────────────

// POST /api/admin/tags/categories — Create category
tags.post('/categories', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const body = await c.req.json<{
    id?: string
    name?: string
    name_en?: string
    description?: string
    sort_order?: number
  }>()

  const id = body.id?.trim()
  const name = body.name?.trim()
  const nameEn = body.name_en?.trim()
  const description = body.description?.trim() ?? ''
  const sortOrder = body.sort_order ?? 0

  if (!id || id.length < 1 || id.length > 50) {
    return c.json({ success: false, error: 'ID must be 1-50 characters' }, 400)
  }
  if (!name || name.length < 1 || name.length > 100) {
    return c.json({ success: false, error: 'Name must be 1-100 characters' }, 400)
  }
  if (!nameEn || nameEn.length < 1 || nameEn.length > 100) {
    return c.json({ success: false, error: 'English name must be 1-100 characters' }, 400)
  }

  // Check for duplicate
  const existing = await c.env.DB.prepare('SELECT id FROM tag_categories WHERE id = ?')
    .bind(id)
    .first()

  if (existing) {
    return c.json({ success: false, error: 'Category ID already exists' }, 409)
  }

  await c.env.DB.prepare(
    'INSERT INTO tag_categories (id, name, name_en, description, sort_order) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, name, nameEn, description, sortOrder)
    .run()

  logger.info('Tag category created', { categoryId: id })

  return c.json(
    {
      success: true,
      category: { id, name, nameEn, description, sortOrder },
    },
    201,
  )
})

// PUT /api/admin/tags/categories/:id — Update category
tags.put('/categories/:id', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    name_en?: string
    description?: string
    sort_order?: number
  }>()

  const existing = await c.env.DB.prepare('SELECT * FROM tag_categories WHERE id = ?')
    .bind(id)
    .first<TagCategory>()

  if (!existing) return c.json({ success: false, error: 'Category not found' }, 404)

  const sets: string[] = []
  const params: unknown[] = []

  if (body.name !== undefined) {
    sets.push('name = ?')
    params.push(body.name.trim())
  }
  if (body.name_en !== undefined) {
    sets.push('name_en = ?')
    params.push(body.name_en.trim())
  }
  if (body.description !== undefined) {
    sets.push('description = ?')
    params.push(body.description.trim())
  }
  if (body.sort_order !== undefined) {
    sets.push('sort_order = ?')
    params.push(body.sort_order)
  }

  if (sets.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400)

  params.push(id)
  await c.env.DB.prepare(`UPDATE tag_categories SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  logger.info('Tag category updated', { categoryId: id })

  const updated = await c.env.DB.prepare('SELECT * FROM tag_categories WHERE id = ?')
    .bind(id)
    .first<TagCategory>()

  return c.json({
    success: true,
    category: updated
      ? {
          id: updated.id,
          name: updated.name,
          nameEn: updated.name_en,
          description: updated.description,
          sortOrder: updated.sort_order,
        }
      : null,
  })
})

// DELETE /api/admin/tags/categories/:id — Delete category (cascades to tags + entry_tags)
tags.delete('/categories/:id', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT id FROM tag_categories WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) return c.json({ success: false, error: 'Category not found' }, 404)

  // Count what will be deleted
  const tagCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM tags WHERE category_id = ?',
  )
    .bind(id)
    .first<{ count: number }>()

  await c.env.DB.prepare('DELETE FROM tag_categories WHERE id = ?').bind(id).run()

  logger.info('Tag category deleted', { categoryId: id, tagsDeleted: tagCount?.count ?? 0 })

  return c.json({
    success: true,
    message: `Category deleted along with ${tagCount?.count ?? 0} tags`,
  })
})

// ─── Tag CRUD ───────────────────────────────────────────────

// POST /api/admin/tags — Create tag
tags.post('/', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const body = await c.req.json<{
    id?: string
    category_id?: string
    name?: string
    name_zh?: string
    description?: string
    ai_keywords?: string[]
    sort_order?: number
  }>()

  const id = body.id?.trim()
  const categoryId = body.category_id?.trim()
  const name = body.name?.trim()
  const nameZh = body.name_zh?.trim()
  const description = body.description?.trim() ?? ''
  const aiKeywords = body.ai_keywords ?? []
  const sortOrder = body.sort_order ?? 0

  if (!id || id.length < 1 || id.length > 20) {
    return c.json({ success: false, error: 'ID must be 1-20 characters' }, 400)
  }
  if (!categoryId) {
    return c.json({ success: false, error: 'Category ID is required' }, 400)
  }
  if (!name || name.length < 1 || name.length > 100) {
    return c.json({ success: false, error: 'Name must be 1-100 characters' }, 400)
  }
  if (!nameZh || nameZh.length < 1 || nameZh.length > 100) {
    return c.json({ success: false, error: 'Chinese name must be 1-100 characters' }, 400)
  }

  // Verify category exists
  const category = await c.env.DB.prepare('SELECT id FROM tag_categories WHERE id = ?')
    .bind(categoryId)
    .first()

  if (!category) return c.json({ success: false, error: 'Category not found' }, 404)

  // Check for duplicate
  const existing = await c.env.DB.prepare('SELECT id FROM tags WHERE id = ?').bind(id).first()

  if (existing) return c.json({ success: false, error: 'Tag ID already exists' }, 409)

  await c.env.DB.prepare(
    `INSERT INTO tags (id, category_id, name, name_zh, description, ai_keywords, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, categoryId, name, nameZh, description, JSON.stringify(aiKeywords), sortOrder)
    .run()

  logger.info('Tag created', { tagId: id, categoryId })

  return c.json(
    {
      success: true,
      tag: {
        id,
        categoryId,
        name,
        nameZh,
        description,
        aiKeywords,
        sortOrder,
      },
    },
    201,
  )
})

// PUT /api/admin/tags/:id — Update tag
tags.put('/:id', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const id = c.req.param('id')
  const body = await c.req.json<{
    category_id?: string
    name?: string
    name_zh?: string
    description?: string
    ai_keywords?: string[]
    sort_order?: number
  }>()

  const existing = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first<Tag>()

  if (!existing) return c.json({ success: false, error: 'Tag not found' }, 404)

  // If changing category, verify new one exists
  if (body.category_id && body.category_id !== existing.category_id) {
    const category = await c.env.DB.prepare('SELECT id FROM tag_categories WHERE id = ?')
      .bind(body.category_id)
      .first()
    if (!category) return c.json({ success: false, error: 'Target category not found' }, 404)
  }

  const sets: string[] = []
  const params: unknown[] = []

  if (body.category_id !== undefined) {
    sets.push('category_id = ?')
    params.push(body.category_id.trim())
  }
  if (body.name !== undefined) {
    sets.push('name = ?')
    params.push(body.name.trim())
  }
  if (body.name_zh !== undefined) {
    sets.push('name_zh = ?')
    params.push(body.name_zh.trim())
  }
  if (body.description !== undefined) {
    sets.push('description = ?')
    params.push(body.description.trim())
  }
  if (body.ai_keywords !== undefined) {
    sets.push('ai_keywords = ?')
    params.push(JSON.stringify(body.ai_keywords))
  }
  if (body.sort_order !== undefined) {
    sets.push('sort_order = ?')
    params.push(body.sort_order)
  }

  if (sets.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400)

  sets.push("updated_at = datetime('now')")
  params.push(id)

  await c.env.DB.prepare(`UPDATE tags SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  logger.info('Tag updated', { tagId: id })

  const updated = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first<Tag>()

  return c.json({ success: true, tag: updated })
})

// DELETE /api/admin/tags/:id — Delete tag (cascades to entry_tags)
tags.delete('/:id', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT id FROM tags WHERE id = ?').bind(id).first()

  if (!existing) return c.json({ success: false, error: 'Tag not found' }, 404)

  await c.env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run()

  logger.info('Tag deleted', { tagId: id })

  return c.json({ success: true, message: 'Tag deleted' })
})

// ─── Entry-Tag Management ───────────────────────────────────

// POST /api/admin/entries/:scpNumber/tags — Assign tags to entry
tags.post('/entry/:scpNumber', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const scpNumber = parseInt(c.req.param('scpNumber'), 10)
  if (isNaN(scpNumber)) return c.json({ success: false, error: 'Invalid SCP number' }, 400)

  const body = await c.req.json<{ tag_ids?: string[]; language?: string }>()
  const tagIds = body.tag_ids
  const language = body.language?.trim() || 'en'

  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return c.json({ success: false, error: 'tag_ids must be a non-empty array' }, 400)
  }

  if (language !== 'en' && language !== 'cn') {
    return c.json({ success: false, error: "Language must be 'en' or 'cn'" }, 400)
  }

  // Verify all tags exist
  const placeholders = tagIds.map(() => '?').join(',')
  const existingTags = await c.env.DB.prepare(`SELECT id FROM tags WHERE id IN (${placeholders})`)
    .bind(...tagIds)
    .all<{ id: string }>()

  if (existingTags.results.length !== tagIds.length) {
    const found = new Set(existingTags.results.map((t) => t.id))
    const missing = tagIds.filter((t) => !found.has(t))
    return c.json({ success: false, error: `Tags not found: ${missing.join(', ')}` }, 400)
  }

  // Insert associations (ignore duplicates)
  let added = 0
  for (const tagId of tagIds) {
    const result = await c.env.DB.prepare(
      'INSERT OR IGNORE INTO entry_tags (scp_number, language, tag_id) VALUES (?, ?, ?)',
    )
      .bind(scpNumber, language, tagId)
      .run()
    if (result.meta.changes > 0) added++
  }

  logger.info('Tags assigned to entry', { scpNumber, language, tagIds, added })

  return c.json({
    success: true,
    message: `${added} tag(s) assigned to SCP-${scpNumber}`,
    added,
    skipped: tagIds.length - added,
  })
})

// DELETE /api/admin/entries/:scpNumber/tags/:tagId — Remove tag from entry
tags.delete('/entry/:scpNumber/:tagId', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const scpNumber = parseInt(c.req.param('scpNumber'), 10)
  if (isNaN(scpNumber)) return c.json({ success: false, error: 'Invalid SCP number' }, 400)

  const tagId = c.req.param('tagId')
  const language = c.req.query('language')?.trim() || 'en'

  const result = await c.env.DB.prepare(
    'DELETE FROM entry_tags WHERE scp_number = ? AND language = ? AND tag_id = ?',
  )
    .bind(scpNumber, language, tagId)
    .run()

  if (result.meta.changes === 0) {
    return c.json({ success: false, error: 'Entry-tag association not found' }, 404)
  }

  logger.info('Tag removed from entry', { scpNumber, language, tagId })

  return c.json({ success: true, message: 'Tag removed from entry' })
})

// ─── POST /api/admin/tags/entry/:scpNumber/auto — AI auto-tag an entry ────
// Triggers GLM-4-flash to analyze entry content and assign tags from the pool.

tags.post('/entry/:scpNumber/auto', async (c) => {
  const logger = getLoggerFromContext(c).child({ category: 'admin' })
  const scpNumber = parseInt(c.req.param('scpNumber'), 10)
  if (isNaN(scpNumber)) return c.json({ success: false, error: 'Invalid SCP number' }, 400)

  const body = await c.req.json<{ language?: string; force?: boolean }>().catch((err) => {
    logger.warn('Malformed JSON body on auto-tag request — using defaults', {
      scpNumber,
      error: err instanceof Error ? err.message : String(err),
    })
    return {} as { language?: string; force?: boolean }
  })
  const language = (body.language?.trim() || 'en') as 'en' | 'cn'

  if (language !== 'en' && language !== 'cn') {
    return c.json({ success: false, error: "Language must be 'en' or 'cn'" }, 400)
  }

  // Verify entry exists
  const entry = await c.env.DB.prepare(
    'SELECT scp_number, content FROM scp_entries WHERE scp_number = ? AND language = ?',
  )
    .bind(scpNumber, language)
    .first<{ scp_number: number; content: string | null }>()

  if (!entry) {
    return c.json(
      { success: false, error: `SCP-${scpNumber} not found for language '${language}'` },
      404,
    )
  }

  if (!entry.content) {
    return c.json({ success: false, error: `SCP-${scpNumber} has no content to analyze` }, 400)
  }

  // If force is set, clear existing tags first to allow re-tagging
  if (body.force) {
    await c.env.DB.prepare('DELETE FROM entry_tags WHERE scp_number = ? AND language = ?')
      .bind(scpNumber, language)
      .run()
  }

  // Check if already tagged
  if (!body.force) {
    const existing = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM entry_tags WHERE scp_number = ? AND language = ?',
    )
      .bind(scpNumber, language)
      .first<{ count: number }>()

    if (existing && existing.count > 0) {
      return c.json(
        {
          success: false,
          error: `SCP-${scpNumber} already has ${existing.count} tags. Use force: true to re-tag.`,
          existingCount: existing.count,
        },
        409,
      )
    }
  }

  const tagIds = await autoTagEntry(c.env.DB, c.env.GLM_API_KEY, scpNumber, language, logger)

  if (!tagIds) {
    return c.json(
      {
        success: false,
        error: 'Auto-tagging failed or returned no tags',
      },
      500,
    )
  }

  return c.json({
    success: true,
    message: `SCP-${scpNumber} auto-tagged with ${tagIds.length} tags`,
    tagIds,
  })
})

export default tags
