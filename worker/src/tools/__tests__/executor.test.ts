import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeTool } from '../executor'

// ─── Mock D1 ─────────────────────────────────────────────────

function createMockDb(rows: Record<string, unknown>[] = []) {
  return {
    prepare: vi.fn((sql: string) => {
      const stmt = {
        _sql: sql,
        _params: [] as unknown[],
        bind(...params: unknown[]) {
          stmt._params = params
          return stmt
        },
        first: vi.fn(async () => {
          // Return first matching row for get_scp_entry
          if (sql.includes('WHERE scp_number = ?')) {
            const [scp_number, language] = stmt._params
            return rows.find((r) => r.scp_number === scp_number && r.language === language) ?? null
          }
          return null
        }),
        all: vi.fn(async () => {
          // Extract LIMIT from the last bound param
          const limitParam = sql.includes('LIMIT')
            ? stmt._params[stmt._params.length - 1]
            : undefined
          const limit = typeof limitParam === 'number' ? limitParam : rows.length

          // Filter rows based on query type
          let filtered = rows
          if (sql.includes('LIKE')) {
            const queryPattern = stmt._params.find((p) => typeof p === 'string' && p.includes('%'))
            const query = ((queryPattern as string) ?? '').replace(/%/g, '').toLowerCase()
            filtered = rows.filter((r) => (r.name as string).toLowerCase().includes(query))
          } else if (sql.includes('object_class = ?')) {
            const objectClass = stmt._params.find(
              (p) => typeof p === 'string' && !p.includes('%') && p.length > 2,
            )
            filtered = rows.filter((r) => r.object_class === objectClass)
          }

          return { results: filtered.slice(0, limit) }
        }),
      }
      return stmt
    }),
  }
}

const mockEntries = [
  {
    scp_number: 173,
    name: 'The Sculpture',
    object_class: 'Euclid',
    language: 'en',
    content: 'SCP-173 is a concrete sculpture...',
  },
  {
    scp_number: 682,
    name: 'Hard-to-Destroy Reptile',
    object_class: 'Keter',
    language: 'en',
    content: 'SCP-682 is a large, vaguely...',
  },
  {
    scp_number: 999,
    name: 'Tickle Monster',
    object_class: 'Safe',
    language: 'en',
    content: 'SCP-999 is a large, amorphous...',
  },
  {
    scp_number: 173,
    name: '雕像',
    object_class: 'Euclid',
    language: 'cn',
    content: 'SCP-173是一个混凝土雕塑...',
  },
]

// ─── Tests ──────────────────────────────────────────────────

describe('executeTool', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb(mockEntries)
  })

  describe('search_scp_entries', () => {
    it('returns matching entries', async () => {
      const result = await executeTool(db as any, 'search_scp_entries', { query: 'sculpture' })
      const parsed = JSON.parse(result)

      expect(parsed.entries).toBeDefined()
      expect(parsed.entries.length).toBeGreaterThan(0)
      expect(parsed.entries[0].scp_number).toBe(173)
      expect(parsed.entries[0].scp_id).toBe('SCP-173')
    })

    it('returns empty with message when no matches', async () => {
      db = createMockDb([])
      const result = await executeTool(db as any, 'search_scp_entries', { query: 'nonexistent' })
      const parsed = JSON.parse(result)

      expect(parsed.entries).toEqual([])
      expect(parsed.message).toContain('No SCP entries found')
    })

    it('respects limit parameter', async () => {
      const result = await executeTool(db as any, 'search_scp_entries', { query: '', limit: 2 })
      const parsed = JSON.parse(result)

      expect(parsed.entries.length).toBeLessThanOrEqual(2)
    })

    it('defaults language to en', async () => {
      await executeTool(db as any, 'search_scp_entries', { query: 'test' })

      const call = db.prepare.mock.calls[0]
      const _params = call[0]
      // Should have bound 'en' as language
      expect(db.prepare).toHaveBeenCalled()
    })
  })

  describe('get_scp_entry', () => {
    it('returns entry by SCP number', async () => {
      const result = await executeTool(db as any, 'get_scp_entry', { scp_number: 173 })
      const parsed = JSON.parse(result)

      expect(parsed.scp_number).toBe(173)
      expect(parsed.scp_id).toBe('SCP-173')
      expect(parsed.name).toBe('The Sculpture')
      expect(parsed.object_class).toBe('Euclid')
      expect(parsed.content).toContain('concrete sculpture')
    })

    it('returns error for non-existent entry', async () => {
      const result = await executeTool(db as any, 'get_scp_entry', { scp_number: 9999 })
      const parsed = JSON.parse(result)

      expect(parsed.error).toContain('not found')
    })

    it('supports Chinese language', async () => {
      const result = await executeTool(db as any, 'get_scp_entry', {
        scp_number: 173,
        language: 'cn',
      })
      const parsed = JSON.parse(result)

      expect(parsed.name).toBe('雕像')
    })

    it('truncates long content', async () => {
      db = createMockDb([
        {
          scp_number: 1,
          name: 'Test',
          object_class: 'Safe',
          language: 'en',
          content: 'A'.repeat(5000),
        },
      ])

      const result = await executeTool(db as any, 'get_scp_entry', { scp_number: 1 })
      const parsed = JSON.parse(result)

      expect(parsed.content.length).toBeLessThan(5000)
      expect(parsed.content).toContain('[Content truncated')
    })
  })

  describe('list_scp_entries_by_class', () => {
    it('returns entries filtered by class', async () => {
      const result = await executeTool(db as any, 'list_scp_entries_by_class', {
        object_class: 'Keter',
      })
      const parsed = JSON.parse(result)

      expect(parsed.entries.length).toBeGreaterThan(0)
      expect(parsed.entries[0].object_class).toBe('Keter')
      expect(parsed.filter).toBe('Keter')
    })

    it('returns empty for class with no entries', async () => {
      db = createMockDb([])
      const result = await executeTool(db as any, 'list_scp_entries_by_class', {
        object_class: 'Thaumiel',
      })
      const parsed = JSON.parse(result)

      expect(parsed.entries).toEqual([])
      expect(parsed.message).toContain('No Thaumiel entries')
    })

    it('respects limit parameter', async () => {
      const result = await executeTool(db as any, 'list_scp_entries_by_class', {
        object_class: 'Euclid',
        limit: 1,
      })
      const parsed = JSON.parse(result)

      expect(parsed.entries.length).toBeLessThanOrEqual(1)
    })
  })

  describe('error handling', () => {
    it('returns error for unknown tool', async () => {
      const result = await executeTool(db as any, 'unknown_tool', {})
      const parsed = JSON.parse(result)

      expect(parsed.error).toContain('Unknown tool')
    })

    it('returns error on database failure', async () => {
      const brokenDb = {
        prepare: vi.fn(() => {
          throw new Error('DB connection lost')
        }),
      }

      const result = await executeTool(brokenDb as any, 'search_scp_entries', { query: 'test' })
      const parsed = JSON.parse(result)

      expect(parsed.error).toContain('Tool execution failed')
      expect(parsed.error).toContain('DB connection lost')
    })
  })
})
