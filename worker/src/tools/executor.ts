// ─── MCP Tool Executor ───────────────────────────────────────
// Executes MCP tool calls by querying the D1 database.

import type { D1Database } from '@cloudflare/workers-types'

const MAX_RESULTS = 10

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

// ─── Public API ──────────────────────────────────────────────

export async function executeTool(
  db: D1Database,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case 'search_scp_entries':
        return await searchEntries(db, args as unknown as SearchArgs)
      case 'get_scp_entry':
        return await getEntry(db, args as unknown as GetEntryArgs)
      case 'list_scp_entries_by_class':
        return await listByClass(db, args as unknown as ListByClassArgs)
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (err) {
    return JSON.stringify({
      error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
    })
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
       LIMIT ?`
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
       WHERE scp_number = ? AND language = ?`
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
       LIMIT ?`
    )
    .bind(language, object_class, cappedLimit)
    .all<{ scp_number: number; name: string; object_class: string }>()

  if (!rows.results.length) {
    return JSON.stringify({ entries: [], message: `No ${object_class} entries found in ${language}.` })
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
