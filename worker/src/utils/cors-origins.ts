const CACHE_TTL_MS = 60_000

let cache: { origins: string[]; expiresAt: number } | null = null

export async function getDynamicOrigins(db: D1Database): Promise<string[]> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.origins

  const rows = await db.prepare('SELECT origin FROM cors_origins').all<{ origin: string }>()
  const origins = (rows.results ?? []).map((r) => r.origin)
  cache = { origins, expiresAt: now + CACHE_TTL_MS }
  return origins
}

export function invalidateDynamicOriginsCache(): void {
  cache = null
}
