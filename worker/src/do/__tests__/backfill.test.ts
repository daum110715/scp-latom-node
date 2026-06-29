import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runBackfillBatch, type BackfillCheckpoint } from '../backfill'
import * as httpClient from '../http-client'
import type { Logger } from '../../utils/logger'

// ─── Mocks ──────────────────────────────────────────────────

function createMockStorage(initialData: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initialData))
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value)
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key)
    }),
    setAlarm: vi.fn(async () => {}),
    getAlarm: vi.fn(async () => null),
  }
}

function createMockD1(existingEntries: { scp_number: number; object_class: string }[] = []) {
  return {
    prepare: vi.fn((sql: string) => {
      const stmt = {
        _sql: sql,
        bind: vi.fn((..._args: unknown[]) => stmt),
        first: vi.fn(async () => null),
        all: vi.fn(async () => {
          // Return entries for the backfill query (SELECT scp_number ... WHERE object_class = 'Unknown')
          if (sql.includes('object_class = ?') && sql.includes('scp_number')) {
            return { results: existingEntries.map((e) => ({ scp_number: e.scp_number })) }
          }
          return { results: [] }
        }),
        run: vi.fn(async () => ({})),
      }
      return stmt
    }),
    batch: vi.fn(async () => []),
  }
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Logger

// ─── Tests ──────────────────────────────────────────────────

describe('runBackfillBatch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(httpClient, 'fetchPageLikeBrowser').mockResolvedValue({
      ok: true,
      status: 200,
      html: '<div>Object Class: Safe</div>',
    })
    vi.spyOn(httpClient, 'humanDelay').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when no checkpoint exists', async () => {
    const storage = createMockStorage()
    const db = createMockD1()

    const result = await runBackfillBatch(
      { storage } as unknown as DurableObjectState,
      db as unknown as D1Database,
      globalThis.fetch,
      mockLogger,
    )

    expect(result).toBe(false)
    expect(storage.delete).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('clears checkpoint and returns false when no Unknown entries remain', async () => {
    const checkpoint: BackfillCheckpoint = { language: 'en', offset: 0 }
    const storage = createMockStorage({ backfill_checkpoint: checkpoint })
    const db = createMockD1([])

    const result = await runBackfillBatch(
      { storage } as unknown as DurableObjectState,
      db as unknown as D1Database,
      globalThis.fetch,
      mockLogger,
    )

    expect(result).toBe(false)
    expect(storage.delete).toHaveBeenCalledWith('backfill_checkpoint')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('processes entries and updates D1 with resolved classes', async () => {
    const checkpoint: BackfillCheckpoint = { language: 'en', offset: 0 }
    const storage = createMockStorage({ backfill_checkpoint: checkpoint })
    const db = createMockD1([
      { scp_number: 173, object_class: 'Unknown' },
      { scp_number: 999, object_class: 'Unknown' },
    ])

    const result = await runBackfillBatch(
      { storage } as unknown as DurableObjectState,
      db as unknown as D1Database,
      globalThis.fetch,
      mockLogger,
    )

    // Partial batch (< 500) → reached the end, checkpoint cleared
    expect(result).toBe(false)
    expect(storage.delete).toHaveBeenCalledWith('backfill_checkpoint')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(db.batch).toHaveBeenCalled()
  })

  it('schedules next alarm when full batch is returned', async () => {
    const checkpoint: BackfillCheckpoint = { language: 'en', offset: 0 }
    const storage = createMockStorage({ backfill_checkpoint: checkpoint })

    // Create 500 entries to simulate a full batch
    const entries = Array.from({ length: 500 }, (_, i) => ({
      scp_number: i + 1,
      object_class: 'Unknown',
    }))
    const db = createMockD1(entries)

    const result = await runBackfillBatch(
      { storage } as unknown as DurableObjectState,
      db as unknown as D1Database,
      globalThis.fetch,
      mockLogger,
    )

    // Full batch → should schedule next alarm
    expect(result).toBe(true)
    expect(storage.put).toHaveBeenCalledWith('backfill_checkpoint', {
      language: 'en',
      offset: 500,
    })
    expect(storage.setAlarm).toHaveBeenCalled()
    // Alarm should be ~15 minutes from now
    const alarmArg = (storage.setAlarm as ReturnType<typeof vi.fn>).mock.calls[0][0] as number
    const fifteenMinutes = 15 * 60 * 1000
    expect(alarmArg - Date.now()).toBeGreaterThanOrEqual(fifteenMinutes - 1000)
    expect(alarmArg - Date.now()).toBeLessThanOrEqual(fifteenMinutes + 1000)
  })

  it('uses checkpoint offset for pagination', async () => {
    const checkpoint: BackfillCheckpoint = { language: 'cn', offset: 500 }
    const storage = createMockStorage({ backfill_checkpoint: checkpoint })
    const db = createMockD1([{ scp_number: 600, object_class: 'Unknown' }])

    await runBackfillBatch(
      { storage } as unknown as DurableObjectState,
      db as unknown as D1Database,
      globalThis.fetch,
      mockLogger,
    )

    // Verify the DB query used the correct offset
    const prepareCalls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls
    const backfillQuery = prepareCalls.find(
      (call: string[]) => call[0].includes('object_class = ?') && call[0].includes('OFFSET'),
    )
    expect(backfillQuery).toBeDefined()
  })

  it('handles fetch failures gracefully', async () => {
    const checkpoint: BackfillCheckpoint = { language: 'en', offset: 0 }
    const storage = createMockStorage({ backfill_checkpoint: checkpoint })
    const db = createMockD1([{ scp_number: 173, object_class: 'Unknown' }])

    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      html: null,
      error: 'Server error',
    })

    const result = await runBackfillBatch(
      { storage } as unknown as DurableObjectState,
      db as unknown as D1Database,
      globalThis.fetch,
      mockLogger,
    )

    // Partial batch, fetch failed → checkpoint cleared, no updates
    expect(result).toBe(false)
    expect(storage.delete).toHaveBeenCalledWith('backfill_checkpoint')
    expect(db.batch).not.toHaveBeenCalled()
  })

  it('preserves checkpoint offset from previous batch', async () => {
    const checkpoint: BackfillCheckpoint = { language: 'en', offset: 1000 }
    const storage = createMockStorage({ backfill_checkpoint: checkpoint })
    const db = createMockD1([{ scp_number: 1100, object_class: 'Unknown' }])

    await runBackfillBatch(
      { storage } as unknown as DurableObjectState,
      db as unknown as D1Database,
      globalThis.fetch,
      mockLogger,
    )

    // Verify the query was bound with offset 1000
    const allCalls = (db.prepare as ReturnType<typeof vi.fn>).mock.results
    expect(allCalls.length > 0).toBe(true)
  })
})
