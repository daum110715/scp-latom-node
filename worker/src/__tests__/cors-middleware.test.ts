import { describe, it, expect, beforeEach } from 'vitest'
import app from '../index'
import { invalidateDynamicOriginsCache } from '../utils/cors-origins'
import type { Env } from '../types'

function createMockDB(dynamicOrigins: string[]) {
  return {
    prepare: () => ({
      all: async () => ({ results: dynamicOrigins.map((origin) => ({ origin })) }),
    }),
  }
}

function createEnv(dynamicOrigins: string[]): Env {
  return {
    DB: createMockDB(dynamicOrigins) as unknown as D1Database,
    JWT_SECRET: 'test-secret',
    CORS_ORIGINS: 'https://scp.lat',
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
  } as Env
}

async function requestWithOrigin(origin: string, env: Env) {
  return app.request(
    new Request('http://localhost/api/health', { headers: { Origin: origin } }),
    undefined,
    env,
  )
}

describe('CORS middleware — static + dynamic origins', () => {
  beforeEach(() => {
    invalidateDynamicOriginsCache()
  })

  it('allows an origin from the static (wrangler.toml) list', async () => {
    const env = createEnv([])
    const res = await requestWithOrigin('https://scp.lat', env)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://scp.lat')
  })

  it('allows an origin added dynamically via D1', async () => {
    const env = createEnv(['https://daum.pw'])
    const res = await requestWithOrigin('https://daum.pw', env)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://daum.pw')
  })

  it('allows a wildcard origin added dynamically via D1', async () => {
    const env = createEnv(['https://*.daum.pw'])
    const res = await requestWithOrigin('https://scpadmin.daum.pw', env)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://scpadmin.daum.pw')
  })

  it('rejects an origin that is in neither list', async () => {
    const env = createEnv(['https://daum.pw'])
    const res = await requestWithOrigin('https://evil.com', env)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('falls back to the static list when D1 fails', async () => {
    const env: Env = {
      DB: {
        prepare: () => ({
          all: async () => {
            throw new Error('D1 unavailable')
          },
        }),
      } as unknown as D1Database,
      JWT_SECRET: 'test-secret',
      CORS_ORIGINS: 'https://scp.lat',
      SCP_EN_CRAWLER: {} as DurableObjectNamespace,
      SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    } as Env

    const res = await requestWithOrigin('https://scp.lat', env)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://scp.lat')
    expect(res.status).toBe(200)
  })
})
