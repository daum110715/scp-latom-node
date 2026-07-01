// ─── MCP Tool Executor ───────────────────────────────────────
// Executes MCP tool calls by querying the D1 database.

import type { D1Database } from '@cloudflare/workers-types'

const MAX_RESULTS = 10

const VALID_LANGUAGES = ['en', 'cn']
const VALID_CLASSES = ['Safe', 'Euclid', 'Keter', 'Thaumiel', 'Apollyon', 'Neutralized']

interface SearchArgs {
  query: string
  language?: string
  limit?: number
}

interface GetEntryArgs {
  scp_number: number
  language?: string
}

interface ListByClassArgs {
  object_class: string
  language?: string
  limit?: number
}

// ─── Argument validation ────────────────────────────────────

function validateLanguage(lang: unknown): string {
  if (typeof lang === 'string' && VALID_LANGUAGES.includes(lang)) return lang
  return 'en'
}

function validateLimit(limit: unknown, max = MAX_RESULTS): number {
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return Math.min(Math.max(1, Math.round(limit)), max)
  }
  if (typeof limit === 'string') {
    const n = parseInt(limit, 10)
    if (Number.isFinite(n)) return Math.min(Math.max(1, n), max)
  }
  return 5
}

function validateSearchArgs(args: Record<string, unknown>): SearchArgs | null {
  const query = typeof args.query === 'string' ? args.query.trim() : ''
  if (query.length > 200) return null
  return {
    query,
    language: validateLanguage(args.language),
    limit: validateLimit(args.limit),
  }
}

function validateGetEntryArgs(args: Record<string, unknown>): GetEntryArgs | null {
  const scp_number =
    typeof args.scp_number === 'number'
      ? args.scp_number
      : typeof args.scp_number === 'string'
        ? parseInt(args.scp_number, 10)
        : NaN
  if (!Number.isFinite(scp_number) || scp_number < 1 || scp_number > 9999) return null
  return {
    scp_number: Math.round(scp_number),
    language: validateLanguage(args.language),
  }
}

function validateListByClassArgs(args: Record<string, unknown>): ListByClassArgs | null {
  const object_class = typeof args.object_class === 'string' ? args.object_class : ''
  if (!VALID_CLASSES.includes(object_class)) return null
  return {
    object_class,
    language: validateLanguage(args.language),
    limit: validateLimit(args.limit),
  }
}

// ─── Public API ──────────────────────────────────────────────

export async function executeTool(
  db: D1Database,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    switch (name) {
      case 'search_scp_entries': {
        const validated = validateSearchArgs(args)
        if (!validated) return JSON.stringify({ error: 'Invalid search parameters' })
        return await searchEntries(db, validated)
      }
      case 'get_scp_entry': {
        const validated = validateGetEntryArgs(args)
        if (!validated) return JSON.stringify({ error: 'Invalid entry parameters' })
        return await getEntry(db, validated)
      }
      case 'list_scp_entries_by_class': {
        const validated = validateListByClassArgs(args)
        if (!validated) return JSON.stringify({ error: 'Invalid class filter parameters' })
        return await listByClass(db, validated)
      }
      default:
        return JSON.stringify({ error: 'Unknown tool' })
    }
  } catch {
    // Sanitize error messages — do not leak internal details to the AI context
    return JSON.stringify({ error: 'Tool execution failed. Please try a different query.' })
  }
}

// ─── Tool Implementations ────────────────────────────────────

async function searchEntries(db: D1Database, args: SearchArgs): Promise<string> {
  const { query, language = 'en', limit = 5 } = args
  const cappedLimit = Math.min(Math.max(1, limit), MAX_RESULTS)

  const rows = await db
    .prepare(
      `SELECT scp_number, name, object_class
       FROM scp_entries
       WHERE language = ? AND name LIKE ?
       ORDER BY scp_number ASC
       LIMIT ?`,
    )
    .bind(language, `%${query}%`, cappedLimit)
    .all<{ scp_number: number; name: string; object_class: string }>()

  if (!rows.results.length) {
    return JSON.stringify({ entries: [], message: `No SCP entries found matching "${query}"` })
  }

  return JSON.stringify({
    entries: rows.results.map((r) => ({
      scp_number: r.scp_number,
      scp_id: `SCP-${String(r.scp_number).padStart(3, '0')}`,
      name: r.name,
      object_class: r.object_class,
    })),
    total: rows.results.length,
  })
}

async function getEntry(db: D1Database, args: GetEntryArgs): Promise<string> {
  const { scp_number, language = 'en' } = args

  const row = await db
    .prepare(
      `SELECT scp_number, name, object_class, content
       FROM scp_entries
       WHERE scp_number = ? AND language = ?`,
    )
    .bind(scp_number, language)
    .first<{ scp_number: number; name: string; object_class: string; content: string | null }>()

  if (!row) {
    return JSON.stringify({
      error: `SCP-${String(scp_number).padStart(3, '0')} not found in ${language} language.`,
    })
  }

  // Truncate content to avoid exceeding token limits
  const content = row.content
    ? row.content.length > 3000
      ? row.content.slice(0, 3000) + '\n\n[Content truncated — full entry available on the portal]'
      : row.content
    : 'No content available for this entry.'

  return JSON.stringify({
    scp_number: row.scp_number,
    scp_id: `SCP-${String(row.scp_number).padStart(3, '0')}`,
    name: row.name,
    object_class: row.object_class,
    content,
  })
}

async function listByClass(db: D1Database, args: ListByClassArgs): Promise<string> {
  const { object_class, language = 'en', limit = 5 } = args
  const cappedLimit = Math.min(Math.max(1, limit), MAX_RESULTS)

  const rows = await db
    .prepare(
      `SELECT scp_number, name, object_class
       FROM scp_entries
       WHERE language = ? AND object_class = ?
       ORDER BY scp_number ASC
       LIMIT ?`,
    )
    .bind(language, object_class, cappedLimit)
    .all<{ scp_number: number; name: string; object_class: string }>()

  if (!rows.results.length) {
    return JSON.stringify({
      entries: [],
      message: `No ${object_class} entries found in ${language}.`,
    })
  }

  return JSON.stringify({
    entries: rows.results.map((r) => ({
      scp_number: r.scp_number,
      scp_id: `SCP-${String(r.scp_number).padStart(3, '0')}`,
      name: r.name,
      object_class: r.object_class,
    })),
    total: rows.results.length,
    filter: object_class,
  })
}
