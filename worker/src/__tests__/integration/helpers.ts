/**
 * Shared integration test utilities.
 *
 * Provides an in-memory D1 mock that stores data across requests,
 * enabling cross-route workflow testing through the full Hono app.
 */
import { signToken } from '../../utils/jwt'
import { hashPassword } from '../../utils/password'
import type { Env } from '../../types'

const TEST_SECRET = 'integration-test-jwt-secret-2026'

// ─── In-Memory D1 Mock ──────────────────────────────────────────

interface StoredRow {
  [key: string]: unknown
}

/**
 * Creates an in-memory D1 mock that stores data in Maps.
 * Supports SELECT, INSERT, UPDATE, DELETE, and COUNT queries
 * across all tables used by the application.
 */
export function createIntegrationDB() {
  const tables: Record<string, StoredRow[]> = {
    users: [],
    scp_entries: [],
    browsing_history: [],
    bookmarks: [],
    proposals: [],
    proposal_votes: [],
    entry_reports: [],
    system_logs: [],
    tag_categories: [],
    tags: [],
    entry_tags: [],
    crawl_state: [],
    ai_conversations: [],
    rate_limits: [],
  }

  const nextId: Record<string, number> = {}
  for (const table of Object.keys(tables)) {
    nextId[table] = 1
  }

  function getNextId(table: string): number {
    return nextId[table]++
  }

  function matchTable(sql: string): string | null {
    const lower = sql.toLowerCase()

    // For INSERT/UPDATE/DELETE, extract the target table directly
    const insertMatch = lower.match(/insert\s+(?:or\s+ignore\s+)?into\s+(\w+)/)
    if (insertMatch) return insertMatch[1]

    const updateMatch = lower.match(/update\s+(\w+)/)
    if (updateMatch) return updateMatch[1]

    const deleteMatch = lower.match(/delete\s+from\s+(\w+)/)
    if (deleteMatch) return deleteMatch[1]

    // For SELECT, extract from FROM clause (handles JOINs)
    const fromMatch = lower.match(/from\s+(\w+)/)
    if (fromMatch) return fromMatch[1]

    // Fallback: match any table name
    const ordered = Object.keys(tables).sort((a, b) => b.length - a.length)
    for (const table of ordered) {
      const regex = new RegExp(`\\b${table}\\b`)
      if (regex.test(lower)) return table
    }
    return null
  }

  function parseWhere(
    sql: string,
    params: unknown[],
    paramOffset = 0,
  ): (row: StoredRow) => boolean {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+GROUP|\s*$)/i)
    if (!whereMatch) return () => true

    const clause = whereMatch[1]
    const conditions = clause.split(/\s+AND\s+/i)

    return (row: StoredRow) => {
      let paramIndex = paramOffset
      for (const cond of conditions) {
        if (cond.includes('1=1')) continue

        // Handle table-aliased columns like b.user_id or et.scp_number
        const eqMatch = cond.match(/(?:\w+\.)?(\w+)\s*=\s*\?/)
        const likeMatch = cond.match(/(?:\w+\.)?(\w+)\s+LIKE\s+\?/)
        const inMatch = cond.match(/(?:\w+\.)?(\w+)\s+IN\s+\(([^)]+)\)/i)
        const gteMatch = cond.match(/(?:\w+\.)?(\w+)\s*>=\s*\?/)
        const lteMatch = cond.match(/(?:\w+\.)?(\w+)\s*<=\s*\?/)
        const neqMatch = cond.match(/(?:\w+\.)?(\w+)\s*!=\s*\?/)
        const isNotNull = cond.match(/(?:\w+\.)?(\w+)\s+IS\s+NOT\s+NULL/i)
        const isNull = cond.match(/(?:\w+\.)?(\w+)\s+IS\s+NULL/i)

        if (isNotNull) {
          const col = isNotNull[1]
          if (row[col] === null || row[col] === undefined) return false
        } else if (isNull) {
          const col = isNull[1]
          if (row[col] !== null && row[col] !== undefined) return false
        } else if (neqMatch) {
          const col = neqMatch[1]
          const val = params[paramIndex++]
          if (row[col] == val) return false
        } else if (eqMatch) {
          const col = eqMatch[1]
          const val = params[paramIndex++]
          if (row[col] != val) return false
        } else if (likeMatch) {
          const col = likeMatch[1]
          const pattern = params[paramIndex++] as string
          const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i')
          if (!regex.test(String(row[col] ?? ''))) return false
        } else if (gteMatch) {
          const col = gteMatch[1]
          const val = params[paramIndex++]
          if (String(row[col]) < String(val)) return false
        } else if (lteMatch) {
          const col = lteMatch[1]
          const val = params[paramIndex++]
          if (String(row[col]) > String(val)) return false
        } else if (inMatch) {
          const col = inMatch[1]
          const placeholders = inMatch[2].split(',').map((s) => s.trim())
          const values: unknown[] = []
          for (const p of placeholders) {
            if (p === '?') values.push(params[paramIndex++])
            else values.push(p.replace(/['"]/g, ''))
          }
          if (!values.includes(row[col])) return false
        }
      }
      return true
    }
  }

  return {
    prepare(sql: string) {
      const stmt = {
        _sql: sql,
        _params: [] as unknown[],
        bind(...params: unknown[]) {
          stmt._params = params
          return stmt
        },
        first: async () => {
          const normalizedSql = sql.trim().toLowerCase()

          // COUNT queries — detect alias from SQL (e.g., COUNT(*) as total)
          if (normalizedSql.includes('count(*)')) {
            const table = matchTable(sql)
            if (!table) return { count: 0, total: 0 }
            const filter = parseWhere(sql, stmt._params)
            const count = tables[table].filter(filter).length
            // Detect alias: COUNT(*) as total → { total }, COUNT(*) as count → { count }
            const aliasMatch = sql.match(/COUNT\(\*\)\s+as\s+(\w+)/i)
            const alias = aliasMatch ? aliasMatch[1] : 'count'
            return { [alias]: count }
          }

          // INSERT ... RETURNING
          if (normalizedSql.includes('insert') && normalizedSql.includes('returning')) {
            const table = matchTable(sql)
            if (!table) return null
            const row: StoredRow = { id: getNextId(table) }

            const colMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i)
            if (colMatch) {
              const cols = colMatch[1].split(',').map((s) => s.trim())
              for (let i = 0; i < cols.length; i++) {
                if (i < stmt._params.length) {
                  row[cols[i]] = stmt._params[i]
                }
              }
            }

            if (!row.created_at) row.created_at = new Date().toISOString()
            if (!row.updated_at) row.updated_at = new Date().toISOString()
            if (table === 'users') {
              if (!row.role) row.role = 'personnel'
              if (!row.clearance) row.clearance = 1
            }
            if (table === 'proposals') {
              if (!row.status) row.status = 'open'
              if (!row.category) row.category = 'general'
            }

            tables[table].push(row)
            return row
          }

          // UPDATE ... RETURNING
          if (normalizedSql.includes('update') && normalizedSql.includes('returning')) {
            const table = matchTable(sql)
            if (table) {
              // Count SET params to determine WHERE param offset
              const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i)
              if (setMatch) {
                const setClause = setMatch[1]
                const setParamCount = (setClause.match(/\?/g) || []).length
                const filter = parseWhere(sql, stmt._params, setParamCount)
                for (const row of tables[table]) {
                  if (filter(row)) {
                    const sets = setClause.split(',').map((s) => s.trim())
                    let setParamIdx = 0
                    for (const set of sets) {
                      if (set.includes('?')) {
                        const colMatch2 = set.match(/(\w+)\s*=\s*\?/)
                        if (colMatch2) {
                          row[colMatch2[1]] = stmt._params[setParamIdx]
                          setParamIdx++
                        }
                      } else {
                        const colMatch2 = set.match(/(\w+)\s*=\s*(.+)/)
                        if (colMatch2) {
                          row[colMatch2[1]] = new Date().toISOString()
                        }
                      }
                    }
                    return row
                  }
                }
              }
              return null
            }
          }

          // SUM/CASE queries (vote counts)
          if (normalizedSql.includes('sum(case')) {
            const table = matchTable(sql)
            if (!table) return { vfor: 0, against: 0, abstain: 0 }
            const filter = parseWhere(sql, stmt._params)
            const matching = tables[table].filter(filter)
            const counts = { vfor: 0, against: 0, abstain: 0 }
            for (const row of matching) {
              if (row.vote === 'for') counts.vfor++
              else if (row.vote === 'against') counts.against++
              else if (row.vote === 'abstain') counts.abstain++
            }
            return counts
          }

          // SELECT with WHERE
          const table = matchTable(sql)
          if (!table) return null
          const filter = parseWhere(sql, stmt._params)
          const match = tables[table].find(filter)
          return match || null
        },
        all: async () => {
          const table = matchTable(sql)
          if (!table) return { results: [] }

          const filter = parseWhere(sql, stmt._params)
          let rows = tables[table].filter(filter)
          if (table === 'browsing_history' || table === 'bookmarks') {
            console.log(
              '[DEBUG ALL]',
              table,
              'total:',
              tables[table].length,
              'filtered:',
              rows.length,
              'params:',
              stmt._params,
              'sql:',
              sql.substring(0, 60),
            )
          }

          // ORDER BY
          const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i)
          if (orderMatch) {
            const col = orderMatch[1]
            const dir = (orderMatch[2] || 'ASC').toUpperCase()
            rows.sort((a, b) => {
              const av = String(a[col] ?? '')
              const bv = String(b[col] ?? '')
              return dir === 'DESC' ? bv.localeCompare(av) : av.localeCompare(bv)
            })
          }

          // LIMIT / OFFSET
          const limitMatch = sql.match(/LIMIT\s+\?/i)
          const offsetMatch = sql.match(/OFFSET\s+\?/i)
          if (limitMatch) {
            const limitIdx = sql.substring(0, sql.indexOf('LIMIT')).split('?').length - 1
            const limit = stmt._params[limitIdx] as number
            const offset = offsetMatch ? (stmt._params[limitIdx + 1] as number) || 0 : 0
            rows = rows.slice(offset, offset + limit)
          }

          return { results: rows }
        },
        run: async () => {
          const normalizedSql = sql.trim().toLowerCase()

          // INSERT ... ON CONFLICT ... DO UPDATE (upsert)
          if (normalizedSql.includes('on conflict')) {
            const table = matchTable(sql)
            if (table) {
              const colMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i)
              if (colMatch) {
                const cols = colMatch[1].split(',').map((s) => s.trim())
                const valuesMatch = sql.match(
                  /VALUES\s*\(([\s\S]+)\)\s*(?:ON\s+CONFLICT|RETURNING|$)/i,
                )
                let paramIdx = 0
                const colParamMap: Record<string, unknown> = {}
                if (valuesMatch) {
                  const raw = valuesMatch[1]
                  const values: string[] = []
                  let depth = 0
                  let current = ''
                  for (const ch of raw) {
                    if (ch === '(') depth++
                    if (ch === ')') depth--
                    if (ch === ',' && depth === 0) {
                      values.push(current.trim())
                      current = ''
                    } else {
                      current += ch
                    }
                  }
                  values.push(current.trim())
                  for (let i = 0; i < Math.min(cols.length, values.length); i++) {
                    const v = values[i].trim()
                    if (v === '?') {
                      colParamMap[cols[i]] = stmt._params[paramIdx++]
                    } else if (v.includes('datetime')) {
                      colParamMap[cols[i]] = new Date().toISOString()
                    }
                  }
                  console.log(
                    '[DEBUG] values:',
                    JSON.stringify(values),
                    'colParamMap:',
                    JSON.stringify(colParamMap),
                    'params:',
                    stmt._params.length,
                  )
                }
                const conflictMatch = sql.match(/ON\s+CONFLICT\s*\(([^)]+)\)/i)
                if (conflictMatch) {
                  const conflictCols = conflictMatch[1].split(',').map((s) => s.trim())
                  const existing = tables[table].find((r) => {
                    return conflictCols.every((col) => r[col] == colParamMap[col])
                  })
                  console.log(
                    '[DEBUG] conflictCols:',
                    conflictCols,
                    'existing:',
                    !!existing,
                    'tableRows:',
                    tables[table].length,
                  )
                  if (existing) {
                    const setMatch = sql.match(/DO\s+UPDATE\s+SET\s+(.+?)$/i)
                    if (setMatch) {
                      const sets = setMatch[1].split(',').map((s) => s.trim())
                      for (const set of sets) {
                        if (set.includes('excluded.')) {
                          const colMatch2 = set.match(/(\w+)\s*=\s*excluded\.(\w+)/)
                          if (colMatch2 && colParamMap[colMatch2[2]] !== undefined) {
                            existing[colMatch2[1]] = colParamMap[colMatch2[2]]
                          }
                        } else if (set.includes('datetime')) {
                          const colMatch2 = set.match(/(\w+)\s*=\s*datetime/i)
                          if (colMatch2) existing[colMatch2[1]] = new Date().toISOString()
                        }
                      }
                    }
                    return { meta: { changes: 1 } }
                  }
                  const row: StoredRow = { id: getNextId(table), ...colParamMap }
                  if (!row.created_at) row.created_at = new Date().toISOString()
                  tables[table].push(row)
                  return { meta: { changes: 1 } }
                }
              }
            }
          }

          // INSERT without RETURNING
          if (
            normalizedSql.includes('insert') &&
            !normalizedSql.includes('returning') &&
            !normalizedSql.includes('or ignore') &&
            !normalizedSql.includes('on conflict')
          ) {
            const table = matchTable(sql)
            if (table) {
              const row: StoredRow = { id: getNextId(table) }
              const colMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i)
              if (colMatch) {
                const cols = colMatch[1].split(',').map((s) => s.trim())
                let paramIdx = 0
                for (let i = 0; i < cols.length; i++) {
                  if (paramIdx < stmt._params.length) {
                    row[cols[i]] = stmt._params[paramIdx++]
                  }
                }
              }
              if (!row.created_at) row.created_at = new Date().toISOString()
              tables[table].push(row)
              return { meta: { changes: 1 } }
            }
          }

          // INSERT OR IGNORE
          if (normalizedSql.includes('insert or ignore')) {
            const table = matchTable(sql)
            if (table) {
              const colMatch = sql.match(/INSERT\s+OR\s+IGNORE\s+INTO\s+\w+\s*\(([^)]+)\)/i)
              if (colMatch) {
                const cols = colMatch[1].split(',').map((s) => s.trim())
                const row: StoredRow = { id: getNextId(table) }
                for (let i = 0; i < cols.length; i++) {
                  if (i < stmt._params.length) row[cols[i]] = stmt._params[i]
                }
                const existing = tables[table].find((r) =>
                  cols.every((col, i) => r[col] == stmt._params[i]),
                )
                if (!existing) {
                  tables[table].push(row)
                  return { meta: { changes: 1 } }
                }
                return { meta: { changes: 0 } }
              }
            }
          }

          // UPDATE
          if (normalizedSql.includes('update') && normalizedSql.includes('set')) {
            const table = matchTable(sql)
            if (table) {
              const filter = parseWhere(sql, stmt._params)
              let changes = 0
              for (const row of tables[table]) {
                if (filter(row)) {
                  const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i)
                  if (setMatch) {
                    const sets = setMatch[1].split(',').map((s) => s.trim())
                    let setParamIdx = 0
                    for (const set of sets) {
                      if (set.includes('?')) {
                        const colMatch2 = set.match(/(\w+)\s*=\s*\?/)
                        if (colMatch2) {
                          row[colMatch2[1]] = stmt._params[setParamIdx]
                          setParamIdx++
                        }
                      } else {
                        const colMatch2 = set.match(/(\w+)\s*=\s*(.+)/)
                        if (colMatch2) {
                          row[colMatch2[1]] = new Date().toISOString()
                        }
                      }
                    }
                    changes++
                  }
                }
              }
              return { meta: { changes } }
            }
          }

          // DELETE
          if (normalizedSql.includes('delete')) {
            const table = matchTable(sql)
            if (table) {
              const filter = parseWhere(sql, stmt._params)
              const before = tables[table].length
              tables[table] = tables[table].filter((row) => !filter(row))
              const changes = before - tables[table].length
              return { meta: { changes } }
            }
          }

          return { meta: { changes: 0 } }
        },
      }
      return stmt
    },
    // Expose tables for test setup
    _tables: tables,
    _seedUser: async (codename: string, password: string, role = 'personnel', clearance = 1) => {
      const hashed = await hashPassword(password)
      const row: StoredRow = {
        id: getNextId('users'),
        codename,
        password: hashed,
        role,
        clearance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      tables.users.push(row)
      return row
    },
    _seedEntry: (scpNumber: number, language: string, name: string, objectClass: string) => {
      const row: StoredRow = {
        id: getNextId('scp_entries'),
        scp_number: scpNumber,
        language,
        name,
        object_class: objectClass,
        url: `https://scp-wiki.wikidot.com/scp-${scpNumber}`,
        series: Math.ceil(scpNumber / 1000),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      tables.scp_entries.push(row)
      return row
    },
    _seedTagCategory: (id: string, name: string, nameEn: string) => {
      const row: StoredRow = {
        id,
        name,
        name_en: nameEn,
        description: '',
        sort_order: 0,
        created_at: new Date().toISOString(),
      }
      tables.tag_categories.push(row)
      return row
    },
    _seedTag: (id: string, categoryId: string, name: string, nameZh: string) => {
      const row: StoredRow = {
        id,
        category_id: categoryId,
        name,
        name_zh: nameZh,
        description: '',
        ai_keywords: '[]',
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      tables.tags.push(row)
      return row
    },
    _clear: () => {
      for (const table of Object.keys(tables)) {
        tables[table] = []
        nextId[table] = 1
      }
    },
  }
}

export type IntegrationDB = ReturnType<typeof createIntegrationDB>

// ─── Env Builder ────────────────────────────────────────────────

export function createIntegrationEnv(db: IntegrationDB, overrides?: Partial<Env>): Env {
  return {
    DB: db as any,
    JWT_SECRET: TEST_SECRET,
    CORS_ORIGINS: 'https://scp.lat,https://*.scp.lat,http://localhost:8085',
    LOG_LEVEL: 'error',
    SCP_EN_CRAWLER: {
      idFromName: () => 'mock-id' as any,
      get: () => ({
        fetch: async (url: string) => {
          const path = new URL(url).pathname
          if (path.includes('/status')) {
            return new Response(
              JSON.stringify({ status: 'idle', lastCrawl: Date.now(), totalEntries: 7999 }),
            )
          }
          if (path.includes('/entries')) {
            return new Response(
              JSON.stringify({
                entries: [],
                total: 0,
                page: 1,
                limit: 50,
                totalPages: 0,
                state: { status: 'idle', lastCrawl: 0, totalEntries: 0 },
              }),
            )
          }
          return new Response(JSON.stringify({ success: true }))
        },
      }),
    } as any,
    SCP_CN_CRAWLER: {
      idFromName: () => 'mock-id' as any,
      get: () => ({
        fetch: async () => new Response(JSON.stringify({ success: true })),
      }),
    } as any,
    AI_CHAT_DO: {
      idFromName: () => 'mock-id' as any,
      get: () => ({
        fetch: async () => new Response(JSON.stringify({ success: true })),
      }),
    } as any,
    AI_QUEUE_DO: {
      idFromName: () => 'mock-id' as any,
      get: () => ({
        fetch: async (_url: string) =>
          new Response(
            JSON.stringify({
              success: true,
              conversationId: 'test-conv',
              message: {
                id: '1',
                role: 'assistant',
                content: 'Hello',
                createdAt: new Date().toISOString(),
              },
              title: 'Test',
            }),
          ),
      }),
    } as any,
    GLM_API_KEY: 'test-glm-key',
    ...overrides,
  } as Env
}

// ─── Token Helpers ──────────────────────────────────────────────

export async function signUserToken(
  sub: number,
  codename = 'test_agent',
  role = 'personnel',
  clearance = 1,
) {
  return signToken({ sub, codename, role, clearance }, TEST_SECRET)
}

export async function signAdminToken(sub = 1, codename = 'admin') {
  return signToken({ sub, codename, role: 'admin', clearance: 5 }, TEST_SECRET)
}

// ─── Response Helpers ───────────────────────────────────────────

export async function parseJson<T = any>(res: Response): Promise<T> {
  return res.json() as Promise<T>
}

export { TEST_SECRET }
