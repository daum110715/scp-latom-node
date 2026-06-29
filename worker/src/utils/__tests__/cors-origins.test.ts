import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDynamicOrigins, invalidateDynamicOriginsCache } from '../cors-origins'

function createMockDB(origins: string[]) {
  const all = vi.fn().mockResolvedValue({ results: origins.map((origin) => ({ origin })) })
  return {
    prepare: vi.fn(() => ({ all })),
    _all: all,
  }
}

describe('getDynamicOrigins', () => {
  beforeEach(() => {
    invalidateDynamicOriginsCache()
  })

  it('queries D1 and returns the origin list', async () => {
    const db = createMockDB(['https://a.example.com', 'https://b.example.com'])

    const origins = await getDynamicOrigins(db as unknown as D1Database)

    expect(origins).toEqual(['https://a.example.com', 'https://b.example.com'])
    expect(db._all).toHaveBeenCalledTimes(1)
  })

  it('serves subsequent calls from cache without re-querying D1', async () => {
    const db = createMockDB(['https://a.example.com'])

    await getDynamicOrigins(db as unknown as D1Database)
    await getDynamicOrigins(db as unknown as D1Database)
    await getDynamicOrigins(db as unknown as D1Database)

    expect(db._all).toHaveBeenCalledTimes(1)
  })

  it('re-queries D1 after the cache is invalidated', async () => {
    const db = createMockDB(['https://a.example.com'])

    await getDynamicOrigins(db as unknown as D1Database)
    invalidateDynamicOriginsCache()
    await getDynamicOrigins(db as unknown as D1Database)

    expect(db._all).toHaveBeenCalledTimes(2)
  })

  it('returns an empty array when there are no dynamic origins', async () => {
    const db = createMockDB([])

    const origins = await getDynamicOrigins(db as unknown as D1Database)

    expect(origins).toEqual([])
  })
})
