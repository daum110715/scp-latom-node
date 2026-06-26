import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScpCrawlerDo } from '../scp-crawler'
import type { Env, CrawlState, CrawlEntry } from '../../types'

// ─── Mocks ──────────────────────────────────────────────────

function createMockStorage(initialData: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initialData))
  let alarm: number | null = null

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value)
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key)
    }),
    setAlarm: vi.fn(async (time: number) => {
      alarm = time
    }),
    getAlarm: vi.fn(async () => alarm),
    _store: store,
    _alarm: () => alarm,
  }
}

function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    DB: {} as D1Database,
    JWT_SECRET: 'test',
    CORS_ORIGINS: '*',
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    ...overrides,
  } as Env
}

function createMockState(storageData?: Record<string, unknown>) {
  const storage = createMockStorage(storageData)
  return {
    storage,
    id: 'mock-do-id',
    blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
  } as unknown as DurableObjectState
}

// ─── Tests ──────────────────────────────────────────────────

describe('ScpCrawlerDo', () => {
  let env: Env

  beforeEach(() => {
    env = createMockEnv()
  })

  describe('fetch handler', () => {
    it('returns error for missing language prefix', async () => {
      const state = createMockState()
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/status')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as { success: boolean; error: string }

      expect(res.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toContain('Missing language prefix')
    })

    it('returns status for /en/status', async () => {
      const state = createMockState()
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/status')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        language: string
        state: CrawlState
        incremental: { nextSeries: number; seriesLastCrawl: Record<number, number> }
      }

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.language).toBe('en')
      expect(body.state).toBeDefined()
      expect(body.state.status).toBe('idle')
      expect(body.state.totalEntries).toBe(0)
      expect(body.incremental).toBeDefined()
      expect(body.incremental.nextSeries).toBe(0)
      expect(body.incremental.seriesLastCrawl).toEqual({})
    })

    it('returns status for /cn/status', async () => {
      const state = createMockState()
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/cn/status')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        language: string
      }

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.language).toBe('cn')
    })

    it('returns stored state with incremental info', async () => {
      const storedState: CrawlState = {
        status: 'idle',
        lastCrawl: 1719400000000,
        totalEntries: 5000,
      }
      const storedCursor = 3
      const storedCrawlMap: Record<number, number> = { 1: 1719400000000, 2: 1719400000000 }
      const state = createMockState({
        state: storedState,
        crawl_cursor: storedCursor,
        last_crawl_map: storedCrawlMap,
      })
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/status')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        state: CrawlState
        incremental: { nextSeries: number; seriesLastCrawl: Record<number, number> }
      }

      expect(body.state.status).toBe('idle')
      expect(body.state.totalEntries).toBe(5000)
      expect(body.incremental.nextSeries).toBe(3)
      expect(body.incremental.seriesLastCrawl).toEqual(storedCrawlMap)
    })

    it('returns empty entries when no data', async () => {
      const state = createMockState()
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/entries')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        entries: CrawlEntry[]
        total: number
      }

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.entries).toEqual([])
      expect(body.total).toBe(0)
    })

    it('returns stored entries', async () => {
      const storedEntries: CrawlEntry[] = [
        { scpNumber: 173, name: 'The Sculpture', objectClass: 'Euclid', url: 'https://scp-wiki.wikidot.com/scp-173', series: 1 },
        { scpNumber: 999, name: 'Tickle Monster', objectClass: 'Safe', url: 'https://scp-wiki.wikidot.com/scp-999', series: 1 },
      ]
      const storedState: CrawlState = {
        status: 'idle',
        lastCrawl: Date.now(),
        totalEntries: 2,
      }
      const state = createMockState({ state: storedState, entries: storedEntries })
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/entries')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        entries: CrawlEntry[]
        total: number
      }

      expect(body.success).toBe(true)
      expect(body.entries).toHaveLength(2)
      expect(body.total).toBe(2)
    })

    it('filters entries by class', async () => {
      const storedEntries: CrawlEntry[] = [
        { scpNumber: 173, name: 'The Sculpture', objectClass: 'Euclid', url: '', series: 1 },
        { scpNumber: 999, name: 'Tickle Monster', objectClass: 'Safe', url: '', series: 1 },
      ]
      const storedState: CrawlState = { status: 'idle', lastCrawl: Date.now(), totalEntries: 2 }
      const state = createMockState({ state: storedState, entries: storedEntries })
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/entries?class=Safe')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        entries: CrawlEntry[]
      }

      expect(body.success).toBe(true)
      expect(body.entries).toHaveLength(1)
      expect(body.entries[0].objectClass).toBe('Safe')
    })

    it('searches entries by query', async () => {
      const storedEntries: CrawlEntry[] = [
        { scpNumber: 173, name: 'The Sculpture', objectClass: 'Euclid', url: '', series: 1 },
        { scpNumber: 999, name: 'Tickle Monster', objectClass: 'Safe', url: '', series: 1 },
      ]
      const storedState: CrawlState = { status: 'idle', lastCrawl: Date.now(), totalEntries: 2 }
      const state = createMockState({ state: storedState, entries: storedEntries })
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/entries?q=173')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        entries: CrawlEntry[]
      }

      expect(body.success).toBe(true)
      expect(body.entries).toHaveLength(1)
      expect(body.entries[0].scpNumber).toBe(173)
    })

    it('paginates entries', async () => {
      const storedEntries: CrawlEntry[] = Array.from({ length: 100 }, (_, i) => ({
        scpNumber: i + 1,
        name: `SCP-${i + 1}`,
        objectClass: 'Safe',
        url: '',
        series: 1,
      }))
      const storedState: CrawlState = { status: 'idle', lastCrawl: Date.now(), totalEntries: 100 }
      const state = createMockState({ state: storedState, entries: storedEntries })
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/entries?page=2&limit=20')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        entries: CrawlEntry[]
        page: number
        limit: number
        total: number
        totalPages: number
      }

      expect(body.success).toBe(true)
      expect(body.entries).toHaveLength(20)
      expect(body.page).toBe(2)
      expect(body.limit).toBe(20)
      expect(body.total).toBe(100)
      expect(body.totalPages).toBe(5)
    })

    it('returns series data', async () => {
      const storedEntries: CrawlEntry[] = [
        { scpNumber: 173, name: 'The Sculpture', objectClass: 'Euclid', url: '', series: 1 },
      ]
      const state = createMockState({ series_1: storedEntries })
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/series/1')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        series: number
        entries: CrawlEntry[]
      }

      expect(body.success).toBe(true)
      expect(body.series).toBe(1)
      expect(body.entries).toHaveLength(1)
    })

    it('rejects invalid series number', async () => {
      const state = createMockState()
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/series/99')
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as { success: boolean; error: string }

      expect(res.status).toBe(400)
      expect(body.success).toBe(false)
    })

    it('returns 404 for unknown paths', async () => {
      const state = createMockState()
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/unknown')
      const res = await doInstance.fetch(req)

      expect(res.status).toBe(404)
    })

    it('triggers full crawl via POST', async () => {
      const state = createMockState()
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/crawl', { method: 'POST' })
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as {
        success: boolean
        message: string
        state: CrawlState
      }

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.message).toBe('Full crawl triggered')
      expect(body.state.status).toBe('crawling')
    })

    it('rejects crawl when already crawling', async () => {
      const storedState: CrawlState = {
        status: 'crawling',
        lastCrawl: 0,
        totalEntries: 0,
      }
      const state = createMockState({ state: storedState })
      const doInstance = new ScpCrawlerDo(state, env)

      const req = new Request('https://do.scp/en/crawl', { method: 'POST' })
      const res = await doInstance.fetch(req)
      const body = (await res.json()) as { success: boolean; error: string }

      expect(res.status).toBe(409)
      expect(body.success).toBe(false)
      expect(body.error).toContain('already in progress')
    })
  })
})
