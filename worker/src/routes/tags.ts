import { Hono } from 'hono'
import type { Env, TagCategory, Tag, TagPublic, TagCategoryPublic } from '../types'

const tags = new Hono<{ Bindings: Env }>()

// ─── Helpers ────────────────────────────────────────────────

function toTagPublic(tag: Tag): TagPublic {
  let aiKeywords: string[]
  try {
    aiKeywords = JSON.parse(tag.ai_keywords)
  } catch {
    console.warn(`[tags] Corrupted ai_keywords for tag ${tag.id} — falling back to empty list`)
    aiKeywords = []
  }
  return {
    id: tag.id,
    categoryId: tag.category_id,
    name: tag.name,
    nameZh: tag.name_zh,
    description: tag.description,
    aiKeywords,
    sortOrder: tag.sort_order,
  }
}

// ─── GET /api/tags ──────────────────────────────────────────
// List all categories with their tags (grouped)

tags.get('/', async (c) => {
  const categories = await c.env.DB.prepare(
    'SELECT * FROM tag_categories ORDER BY sort_order ASC',
  ).all<TagCategory>()

  const allTags = await c.env.DB.prepare(
    'SELECT * FROM tags ORDER BY category_id ASC, sort_order ASC',
  ).all<Tag>()

  // Group tags by category
  const tagMap = new Map<string, Tag[]>()
  for (const tag of allTags.results) {
    const list = tagMap.get(tag.category_id) ?? []
    list.push(tag)
    tagMap.set(tag.category_id, list)
  }

  const result: TagCategoryPublic[] = categories.results.map((cat) => ({
    id: cat.id,
    name: cat.name,
    nameEn: cat.name_en,
    description: cat.description,
    sortOrder: cat.sort_order,
    tags: (tagMap.get(cat.id) ?? []).map(toTagPublic),
  }))

  return c.json({ success: true, categories: result })
})

// ─── GET /api/tags/categories ───────────────────────────────
// List categories only (without tags)

tags.get('/categories', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM tag_categories ORDER BY sort_order ASC',
  ).all<TagCategory>()

  return c.json({
    success: true,
    categories: rows.results.map((cat) => ({
      id: cat.id,
      name: cat.name,
      nameEn: cat.name_en,
      description: cat.description,
      sortOrder: cat.sort_order,
    })),
  })
})

// ─── GET /api/tags/categories/:id ───────────────────────────
// Single category with its tags

tags.get('/categories/:id', async (c) => {
  const id = c.req.param('id')

  const category = await c.env.DB.prepare('SELECT * FROM tag_categories WHERE id = ?')
    .bind(id)
    .first<TagCategory>()

  if (!category) return c.json({ success: false, error: 'Category not found' }, 404)

  const categoryTags = await c.env.DB.prepare(
    'SELECT * FROM tags WHERE category_id = ? ORDER BY sort_order ASC',
  )
    .bind(id)
    .all<Tag>()

  return c.json({
    success: true,
    category: {
      id: category.id,
      name: category.name,
      nameEn: category.name_en,
      description: category.description,
      sortOrder: category.sort_order,
      tags: categoryTags.results.map(toTagPublic),
    },
  })
})

// ─── GET /api/tags/search ───────────────────────────────────
// Search tags by name, name_zh, or ai_keywords

tags.get('/search', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q) return c.json({ success: false, error: 'Query parameter "q" is required' }, 400)

  const rows = await c.env.DB.prepare(
    `SELECT * FROM tags
     WHERE name LIKE ? OR name_zh LIKE ? OR ai_keywords LIKE ?
     ORDER BY sort_order ASC
     LIMIT 50`,
  )
    .bind(`%${q}%`, `%${q}%`, `%${q}%`)
    .all<Tag>()

  return c.json({
    success: true,
    tags: rows.results.map(toTagPublic),
    total: rows.results.length,
  })
})

// ─── GET /api/tags/:id ──────────────────────────────────────
// Single tag detail

tags.get('/:id', async (c) => {
  const id = c.req.param('id')

  const tag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first<Tag>()

  if (!tag) return c.json({ success: false, error: 'Tag not found' }, 404)

  return c.json({ success: true, tag: toTagPublic(tag) })
})

// ─── GET /api/tags/:id/entries ──────────────────────────────
// Get entries that have a specific tag (paginated)

tags.get('/:id/entries', async (c) => {
  const tagId = c.req.param('id')
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10) || 20))
  const offset = (page - 1) * limit
  const language = c.req.query('language')?.trim()

  // Verify tag exists
  const tag = await c.env.DB.prepare('SELECT id FROM tags WHERE id = ?').bind(tagId).first<Tag>()

  if (!tag) return c.json({ success: false, error: 'Tag not found' }, 404)

  let where = 'WHERE et.tag_id = ?'
  const params: unknown[] = [tagId]

  if (language && (language === 'en' || language === 'cn')) {
    where += ' AND et.language = ?'
    params.push(language)
  }

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM entry_tags et ${where}`)
    .bind(...params)
    .first<{ total: number }>()
  const total = countRow?.total ?? 0

  const rows = await c.env.DB.prepare(
    `SELECT et.scp_number, et.language, et.created_at,
            se.name, se.object_class
     FROM entry_tags et
     LEFT JOIN scp_entries se ON et.scp_number = se.scp_number AND et.language = se.language
     ${where}
     ORDER BY et.scp_number ASC
     LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all<{
      scp_number: number
      language: string
      created_at: string
      name: string | null
      object_class: string | null
    }>()

  return c.json({
    success: true,
    entries: rows.results.map((r) => ({
      scpNumber: r.scp_number,
      language: r.language,
      name: r.name,
      objectClass: r.object_class,
      taggedAt: r.created_at,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

// ─── GET /api/entries/:scpNumber/tags ───────────────────────
// Get tags for a specific entry

tags.get('/entry/:scpNumber', async (c) => {
  const scpNumber = parseInt(c.req.param('scpNumber'), 10)
  if (isNaN(scpNumber)) return c.json({ success: false, error: 'Invalid SCP number' }, 400)

  const language = c.req.query('language')?.trim() || 'en'

  const rows = await c.env.DB.prepare(
    `SELECT t.*
     FROM entry_tags et
     JOIN tags t ON et.tag_id = t.id
     WHERE et.scp_number = ? AND et.language = ?
     ORDER BY t.category_id ASC, t.sort_order ASC`,
  )
    .bind(scpNumber, language)
    .all<Tag>()

  // Group by category
  const grouped: Record<string, TagPublic[]> = {}
  for (const tag of rows.results) {
    const list = grouped[tag.category_id] ?? []
    list.push(toTagPublic(tag))
    grouped[tag.category_id] = list
  }

  return c.json({
    success: true,
    scpNumber,
    language,
    tags: rows.results.map(toTagPublic),
    grouped,
  })
})

export default tags
