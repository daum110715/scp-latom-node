import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDynamicOrigins, invalidateDynamicOriginsCache } from '../cors-origins'

function createOriginsMockDB(origins: string[]) {
  const all = vi.fn().mockResolvedValue({ results: origins.map((origin) => ({ origin })) })
  const mock = {
    prepare: vi.fn(() => ({ all })),
    _all: all,
  }
  return mock as typeof mock & D1Database
}

describe('getDynamicOrigins', () => {
  beforeEach(() => {
    invalidateDynamicOriginsCache()
  })

  it('queries D1 and returns the origin list', async () => {
    const db = createOriginsMockDB(['https://a.example.com', 'https://b.example.com'])

    const origins = await getDynamicOrigins(db)

    expect(origins).toEqual(['https://a.example.com', 'https://b.example.com'])
    expect(db._all).toHaveBeenCalledTimes(1)
  })

  it('serves subsequent calls from cache without re-querying D1', async () => {
    const db = createOriginsMockDB(['https://a.example.com'])

    await getDynamicOrigins(db)
    await getDynamicOrigins(db)
    await getDynamicOrigins(db)

    expect(db._all).toHaveBeenCalledTimes(1)
  })

  it('re-queries D1 after the cache is invalidated', async () => {
    const db = createOriginsMockDB(['https://a.example.com'])

    await getDynamicOrigins(db)
    invalidateDynamicOriginsCache()
    await getDynamicOrigins(db)

    expect(db._all).toHaveBeenCalledTimes(2)
  })

  it('returns an empty array when there are no dynamic origins', async () => {
    const db = createOriginsMockDB([])

    const origins = await getDynamicOrigins(db)

    expect(origins).toEqual([])
  })
})
